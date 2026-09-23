import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/media.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/agent_owned_listing.dart';
import '../../../services/agent_listings_service.dart';

class AgentListingsScreen extends StatefulWidget {
  const AgentListingsScreen({super.key});

  @override
  State<AgentListingsScreen> createState() => _AgentListingsScreenState();
}

class _AgentListingsScreenState extends State<AgentListingsScreen> {
  late final AgentListingsService _service;
  late Future<List<AgentOwnedListing>> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentListingsService(ApiClient.instance.dio);
    _future = _service.getListings();
  }

  BadgeKind _statusKind(String status) => switch (status) {
        'APPROVED' => BadgeKind.success,
        'REJECTED' => BadgeKind.danger,
        _ => BadgeKind.warning,
      };

  Future<void> _renew(AgentOwnedListing listing) async {
    try {
      await _service.renew(listing.id, planTier: listing.listingPlan);
      if (!mounted) return;
      setState(() => _future = _service.getListings());
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Listing renewed.')));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Listings')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.textOnGold,
        onPressed: () async {
          final created = await context.push<bool>(RoutePaths.agentListingNew);
          if (created == true) {
            setState(() => _future = _service.getListings());
          }
        },
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.getListings()),
        child: FutureBuilder<List<AgentOwnedListing>>(
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
                onRetry: () => setState(() => _future = _service.getListings()),
              );
            }
            final listings = snapshot.data ?? [];
            if (listings.isEmpty) {
              return const EmptyState(
                message: 'No listings yet. Tap + to add your first one.',
                icon: Icons.home_work_outlined,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: listings.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final listing = listings[index];
                return AppCard(
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        child: SizedBox(
                          width: 64,
                          height: 64,
                          child: listing.coverImageUrl.isNotEmpty
                              ? CachedNetworkImage(
                                  imageUrl: resolveMediaUrl(listing.coverImageUrl),
                                  fit: BoxFit.cover,
                                  errorWidget: (context, url, error) =>
                                      Container(color: AppColors.surfaceAlt),
                                )
                              : Container(
                                  color: AppColors.surfaceAlt,
                                  child: const Icon(Icons.home_outlined,
                                      color: AppColors.textSecondary),
                                ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              listing.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              Formatters.price(listing.price, perMonth: listing.listingType == 'RENT'),
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppColors.gold,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                StatusBadge(
                                  label: listing.approvalStatus,
                                  kind: _statusKind(listing.approvalStatus),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${listing.unlockCount} unlocks',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                            if (listing.needsRenewal) ...[
                              const SizedBox(height: 6),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: OutlinedButton(
                                  onPressed: () => _renew(listing),
                                  child: Text(
                                    listing.isDelisted ? 'Renew (delisted)' : 'Renew soon',
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
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
