import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/media.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/gold_listing.dart';
import '../../../services/agent_gold_listings_service.dart';

class AgentGoldListingsScreen extends StatefulWidget {
  const AgentGoldListingsScreen({super.key});

  @override
  State<AgentGoldListingsScreen> createState() => _AgentGoldListingsScreenState();
}

class _AgentGoldListingsScreenState extends State<AgentGoldListingsScreen> {
  late final AgentGoldListingsService _service;
  late Future<List<GoldListing>> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentGoldListingsService(ApiClient.instance.dio);
    _future = _service.getGoldListings();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gold Feed')),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.getGoldListings()),
        child: FutureBuilder<List<GoldListing>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: AppColors.gold));
            }
            if (snapshot.hasError) {
              final message = snapshot.error is ApiException
                  ? errorMessageFor(snapshot.error as ApiException)
                  : 'Something went wrong.';
              return ErrorView(
                message: message,
                onRetry: () => setState(() => _future = _service.getGoldListings()),
              );
            }
            final listings = snapshot.data ?? [];
            if (listings.isEmpty) {
              return const EmptyState(
                message: 'No nearby Gold self-listings right now. '
                    '(Requires your shop location to be set.)',
                icon: Icons.star_border,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: listings.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final listing = listings[index];
                return Card(
                  child: ListTile(
                    leading: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(color: AppColors.divider),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: SizedBox(
                        width: 56,
                        height: 56,
                        child: listing.coverImageUrl.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: resolveMediaUrl(listing.coverImageUrl),
                                fit: BoxFit.cover,
                                errorWidget: (context, url, error) =>
                                    Container(color: AppColors.surfaceAlt),
                              )
                            : Container(color: AppColors.surfaceAlt),
                      ),
                    ),
                    title: Text(
                      listing.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      '${Formatters.price(listing.price)} · ${listing.distanceKm.toStringAsFixed(1)} km away',
                      style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w600),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
