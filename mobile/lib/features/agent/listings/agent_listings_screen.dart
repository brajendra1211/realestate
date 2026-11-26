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
import '../../../core/widgets/back_app_bar.dart';

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
      setState(() { _future = _service.getListings(); });
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
      appBar: BackAppBar(title: const Text('My Listings')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.textOnGold,
        onPressed: () async {
          final created = await context.push<bool>(RoutePaths.agentListingNew);
          if (created == true) {
            setState(() { _future = _service.getListings(); });
          }
        },
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() { _future = _service.getListings(); }),
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
                onRetry: () => setState(() { _future = _service.getListings(); }),
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
                  onTap: () => showListingDetails(context, listing),
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
                                  '${listing.unlockCount} unlocks · tap for all details',
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

/// Everything about one of the partner's listings: the property, where it is, the owner and the verification.
void showListingDetails(BuildContext context, AgentOwnedListing l) {
  final r = l.raw;
  String? s(String k) {
    final v = r[k];
    return v == null || '$v'.isEmpty ? null : '$v';
  }

  final req = r['listingRequest'] is Map ? Map<String, dynamic>.from(r['listingRequest'] as Map) : null;
  final rows = <(String, String?)>[
    ('Status', '${l.approvalStatus}${l.isDelisted ? ' · delisted' : ''}'),
    ('Type', '${l.listingType == 'RENT' ? 'Rent' : 'Sale'} · ${l.propertyType.replaceAll('_', ' ').toLowerCase()}'),
    ('Price', Formatters.price(l.price, perMonth: l.listingType == 'RENT')),
    ('Security deposit', s('securityDeposit') == null ? null : Formatters.price(num.parse(s('securityDeposit')!))),
    ('Bedrooms', s('bedrooms')),
    ('Bathrooms', s('bathrooms')),
    ('Area', s('areaSqft') == null ? null : '${s('areaSqft')} sqft'),
    ('Furnishing', s('furnishing')),
    ('Floor', s('floorNumber') == null ? null : '${s('floorNumber')}${s('totalFloors') != null ? ' of ${s('totalFloors')}' : ''}'),
    ('Society', s('societyName')),
    ('Exact address', s('exactAddress')),
    ('Location', [l.locality, l.city].where((e) => e != null && e.isNotEmpty).join(', ')),
    ('Amenities', s('amenities')),
    ('Plan', l.listingPlan == 'GOLD' ? 'Pro' : 'Basic'),
    ('Live until', l.listingExpiresAt == null ? null : '${l.listingExpiresAt!.day}/${l.listingExpiresAt!.month}/${l.listingExpiresAt!.year}'),
    ('Unlocks', '${l.unlockCount}'),
    ('Owner', req == null ? null : '${req['ownerName'] ?? ''} · ${req['ownerPhone'] ?? ''}'),
    ('Verified on site', req == null ? null : (req['status'] == 'SUBMITTED' ? 'Yes, with the owner\'s OTP' : '${req['status']}')),
    ('Owner plan', req == null ? null : '${req['plan'] == 'GOLD' ? 'Pro' : 'Basic'} · ₹${req['amount']}${req['paidAt'] != null ? ' paid' : ' not paid'}'),
  ];
  final description = s('description');
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.8,
      maxChildSize: 0.95,
      builder: (ctx, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.xl),
        children: [
          Text(l.title, style: Theme.of(ctx).textTheme.titleLarge),
          const SizedBox(height: AppSpacing.md),
          for (final row in rows)
            if (row.$2 != null && row.$2!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(width: 120, child: Text(row.$1, style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: AppColors.textMuted))),
                    Expanded(child: Text(row.$2!, style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600))),
                  ],
                ),
              ),
          if (description != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(description, style: Theme.of(ctx).textTheme.bodyMedium),
          ],
        ],
      ),
    ),
  );
}
