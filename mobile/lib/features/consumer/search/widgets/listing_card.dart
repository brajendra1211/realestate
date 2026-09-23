import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/agreement_urgency.dart';
import '../../../../core/utils/enum_labels.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/media.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../models/public_listing.dart';

/// Property card matching the web app's own layout convention: image top
/// with a listing-type badge overlay, price prominent under the image,
/// then a bed/bath/area icon row.
class ListingCard extends StatelessWidget {
  const ListingCard({super.key, required this.listing, this.onTap});

  final PublicListingSummary listing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isRent = listing.listingType == 'RENT';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 4 / 3,
                  child: listing.coverImageUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: resolveMediaUrl(listing.coverImageUrl),
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(
                            color: AppColors.surfaceAlt,
                          ),
                          errorWidget: (context, url, error) => Container(
                            color: AppColors.surfaceAlt,
                            child: const Icon(Icons.home_outlined,
                                color: AppColors.textSecondary, size: 32),
                          ),
                        )
                      : Container(
                          color: AppColors.surfaceAlt,
                          child: const Icon(Icons.home_outlined,
                              color: AppColors.textSecondary, size: 32),
                        ),
                ),
                Positioned(
                  top: AppSpacing.sm,
                  left: AppSpacing.sm,
                  child: StatusBadge(
                    label: EnumLabels.listingType(listing.listingType),
                    kind: isRent ? BadgeKind.rent : BadgeKind.sale,
                  ),
                ),
                if (computeAgreementUrgency(listing.agreementExpiryDate) != null)
                  Positioned(
                    top: AppSpacing.sm,
                    right: AppSpacing.sm,
                    child: Builder(builder: (context) {
                      final urgency = computeAgreementUrgency(listing.agreementExpiryDate)!;
                      final isHot = urgency.tier == AgreementTier.hotDeal;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isHot ? const Color(0xFFDC2626) : const Color(0xFFD97706),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          isHot ? '🔥 Hot Deal' : '⚡ Priority',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      );
                    }),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    Formatters.price(listing.price, perMonth: isRent),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppColors.gold,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.place_outlined,
                          size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          listing.locationLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: 2,
                    children: [
                      if (listing.bedrooms != null)
                        _MetaChip(icon: Icons.bed_outlined, label: '${listing.bedrooms}'),
                      if (listing.bathrooms != null)
                        _MetaChip(icon: Icons.bathtub_outlined, label: '${listing.bathrooms}'),
                      if (listing.areaSqft != null)
                        _MetaChip(icon: Icons.square_foot, label: '${listing.areaSqft} sqft'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 2),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
