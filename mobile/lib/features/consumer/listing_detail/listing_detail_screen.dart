import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/enum_labels.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/media.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/listing_detail.dart';
import '../../../providers/customer_auth_provider.dart';
import '../../../services/public_listings_service.dart';

class ListingDetailScreen extends StatefulWidget {
  const ListingDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  late final PublicListingsService _service;
  late Future<ListingDetail> _future;
  final _pageController = PageController();
  int _imageIndex = 0;
  bool _unlocking = false;

  @override
  void initState() {
    super.initState();
    _service = PublicListingsService(ApiClient.instance.dio);
    _future = _service.getListingDetail(widget.slug);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _handleDirectVisit(ListingDetail listing) {
    final customerAuth = context.read<CustomerAuthProvider>();
    final target = '${RoutePaths.buyerDirectVisit}'
        '?agentListingId=${listing.id}&title=${Uri.encodeComponent(listing.title)}';
    if (!customerAuth.isBuyer) {
      context.push('${RoutePaths.buyerLogin}?from=${Uri.encodeComponent(target)}');
      return;
    }
    context.push(target);
  }

  Future<void> _handleUnlock() async {
    final customerAuth = context.read<CustomerAuthProvider>();
    if (!customerAuth.isBuyer) {
      context.push(
        '${RoutePaths.buyerLogin}?from=${Uri.encodeComponent(RoutePaths.listingDetailPath(widget.slug))}',
      );
      return;
    }

    setState(() => _unlocking = true);
    try {
      await _service.unlockListing(widget.slug);
      if (!mounted) return;
      setState(() => _future = _service.getListingDetail(widget.slug));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unlocked — contact details below.')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _unlocking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Listing details')),
      body: FutureBuilder<ListingDetail>(
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
              onRetry: () => setState(() {
                _future = _service.getListingDetail(widget.slug);
              }),
            );
          }

          final listing = snapshot.data!;
          final isRent = listing.listingType == 'RENT';

          return ListView(
            children: [
              Stack(
                alignment: Alignment.bottomCenter,
                children: [
                  SizedBox(
                    height: 260,
                    child: listing.images.isNotEmpty
                        ? PageView(
                            controller: _pageController,
                            onPageChanged: (i) => setState(() => _imageIndex = i),
                            children: listing.images
                                .map((img) => CachedNetworkImage(
                                      imageUrl: resolveMediaUrl(img.url),
                                      fit: BoxFit.cover,
                                      errorWidget: (context, url, error) => Container(
                                        color: AppColors.surfaceAlt,
                                      ),
                                    ))
                                .toList(),
                          )
                        : Container(
                            color: AppColors.surfaceAlt,
                            child: const Center(
                              child: Icon(Icons.home_outlined,
                                  size: 48, color: AppColors.textSecondary),
                            ),
                          ),
                  ),
                  if (listing.images.length > 1)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(listing.images.length, (i) {
                          final active = i == _imageIndex;
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: active ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: active
                                  ? AppColors.goldLight
                                  : Colors.white.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          );
                        }),
                      ),
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _DetailCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              StatusBadge(
                                label: EnumLabels.listingType(listing.listingType),
                                kind: isRent ? BadgeKind.rent : BadgeKind.sale,
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              StatusBadge(
                                label: EnumLabels.propertyType(listing.propertyType),
                                kind: BadgeKind.neutral,
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            Formatters.price(listing.price, perMonth: isRent),
                            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                  fontSize: 26,
                                  color: AppColors.gold,
                                ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(listing.title, style: Theme.of(context).textTheme.headlineMedium),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.place_outlined,
                                  size: 16, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Text(
                                listing.locality != null
                                    ? '${listing.locality}, ${listing.city}'
                                    : listing.city,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Row(
                            children: [
                              if (listing.bedrooms != null)
                                _Meta(
                                    icon: Icons.bed_outlined,
                                    label: '${listing.bedrooms} Beds'),
                              if (listing.bathrooms != null)
                                _Meta(
                                    icon: Icons.bathtub_outlined,
                                    label: '${listing.bathrooms} Baths'),
                              if (listing.areaSqft != null)
                                _Meta(
                                    icon: Icons.square_foot,
                                    label: '${listing.areaSqft} sqft'),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    _DetailCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Description', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: AppSpacing.xs),
                          Text(listing.description, style: Theme.of(context).textTheme.bodyMedium),
                          if (listing.amenityList.isNotEmpty) ...[
                            const Divider(height: AppSpacing.xl),
                            Text('Amenities', style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: AppSpacing.sm),
                            Wrap(
                              spacing: AppSpacing.sm,
                              runSpacing: AppSpacing.sm,
                              children: listing.amenityList
                                  .map((a) => Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: AppColors.surfaceAlt,
                                          borderRadius: BorderRadius.circular(AppRadius.pill),
                                        ),
                                        child: Text(a,
                                            style: Theme.of(context).textTheme.bodySmall),
                                      ))
                                  .toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (listing.videoUrls.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.md),
                      _VideoToursCard(listing: listing),
                    ],
                    const SizedBox(height: AppSpacing.md),
                    if (!listing.unlocked)
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.primaryNavy,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.lock_outline, color: AppColors.goldLight),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: Text(
                                    'Full address and channel partner contact unlock after a ₹100 payment.',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: const Color(0xFFC6CEDB),
                                        ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.md),
                            AppButton(
                              label: _unlocking ? 'Unlocking…' : 'Unlock for ₹100',
                              expand: true,
                              loading: _unlocking,
                              onPressed: _handleUnlock,
                            ),
                          ],
                        ),
                      )
                    else
                      _DetailCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.verified, size: 18, color: AppColors.success),
                                SizedBox(width: 6),
                                Text('Unlocked', style: TextStyle(fontWeight: FontWeight.w700)),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _ContactRow(
                              icon: Icons.place_outlined,
                              label: 'Address',
                              value: listing.exactAddress ?? '—',
                            ),
                            if (listing.agentName != null)
                              _ContactRow(
                                icon: Icons.badge_outlined,
                                label: 'Channel Partner',
                                value: listing.agentCode != null
                                    ? '${listing.agentName} (${listing.agentCode})'
                                    : listing.agentName!,
                              ),
                            if (listing.shopName != null)
                              _ContactRow(
                                icon: Icons.storefront_outlined,
                                label: 'Shop',
                                value: listing.shopName!,
                              ),
                            if (listing.agentPhone != null)
                              _ContactRow(
                                icon: Icons.call_outlined,
                                label: 'Phone',
                                value: listing.agentPhone!,
                              ),
                          ],
                        ),
                      ),
                    const SizedBox(height: AppSpacing.md),
                    AppButton(
                      label: "I'm at the property — verify visit",
                      variant: AppButtonVariant.secondary,
                      expand: true,
                      onPressed: () => _handleDirectVisit(listing),
                    ),
                    if (listing.agentCode != null) ...[
                      const SizedBox(height: AppSpacing.lg),
                      AppButton(
                        label: 'Rate this channel partner',
                        variant: AppButtonVariant.secondary,
                        expand: true,
                        onPressed: () => context.push(
                          RoutePaths.rateAgentPath(listing.agentCode!),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _DetailCard extends StatelessWidget {
  const _DetailCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.divider),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryNavy.withValues(alpha: 0.06),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.bodySmall),
                Text(value,
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.md),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _VideoToursCard extends StatelessWidget {
  const _VideoToursCard({required this.listing});

  final ListingDetail listing;

  String? _extractYoutubeId(String url) {
    final regExp = RegExp(
      r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})',
      caseSensitive: false,
    );
    final match = regExp.firstMatch(url);
    return match?.group(1);
  }

  void _showVideoDialog(BuildContext context, String url, int index) {
    final ytId = _extractYoutubeId(url);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.play_circle_fill, color: Colors.red),
            const SizedBox(width: 8),
            Text('Video Tour #${index + 1}', style: const TextStyle(fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (ytId != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: CachedNetworkImage(
                    imageUrl: 'https://img.youtube.com/vi/$ytId/hqdefault.jpg',
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            SelectableText(
              url,
              style: const TextStyle(fontSize: 12, color: Colors.blue),
            ),
            const SizedBox(height: 8),
            const Text(
              'Copy link or open video in your browser/app.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final videos = listing.videoUrls;
    if (videos.isEmpty) return const SizedBox.shrink();

    return _DetailCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.video_library_rounded, color: Colors.red, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Videos & Virtual Tours',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${videos.length} ${videos.length == 1 ? "Video" : "Videos"}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.red.shade700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Virtual walkthroughs and property tours for this listing.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: AppSpacing.md),
          ...videos.asMap().entries.map((entry) {
            final idx = entry.key;
            final url = entry.value;
            final ytId = _extractYoutubeId(url);

            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: InkWell(
                onTap: () => _showVideoDialog(context, url, idx),
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfaceAlt,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.horizontal(
                          left: Radius.circular(AppRadius.md),
                        ),
                        child: SizedBox(
                          width: 110,
                          height: 72,
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              if (ytId != null)
                                CachedNetworkImage(
                                  imageUrl: 'https://img.youtube.com/vi/$ytId/hqdefault.jpg',
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => Container(
                                    color: Colors.black87,
                                    child: const Icon(Icons.play_circle_fill, color: Colors.red),
                                  ),
                                )
                              else
                                Container(
                                  color: Colors.black87,
                                  child: const Icon(Icons.videocam_rounded, color: Colors.white70),
                                ),
                              Center(
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: const BoxDecoration(
                                    color: Colors.black54,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.play_arrow_rounded,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  if (ytId != null) ...[
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: Colors.red,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        'YouTube',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                  ],
                                  Expanded(
                                    child: Text(
                                      'Video Tour #${idx + 1}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                url,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Tap to view video',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.gold,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.only(right: 8),
                        child: Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
