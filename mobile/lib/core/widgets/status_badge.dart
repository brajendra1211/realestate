import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

/// Semantic kind a [StatusBadge] can render as — maps to the app's
/// status/tag color tokens (see AppColors).
enum BadgeKind { success, warning, danger, sale, rent, neutral }

/// Small rounded pill used for approval statuses (PENDING/APPROVED/REJECTED)
/// and listing tags (SALE/RENT).
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, required this.kind});

  final String label;
  final BadgeKind kind;

  Color get _background => switch (kind) {
        BadgeKind.success => AppColors.success.withValues(alpha: 0.12),
        BadgeKind.warning => AppColors.warning.withValues(alpha: 0.12),
        BadgeKind.danger => AppColors.danger.withValues(alpha: 0.12),
        BadgeKind.sale => AppColors.saleTag,
        BadgeKind.rent => AppColors.rentTag,
        BadgeKind.neutral => AppColors.surfaceAlt,
      };

  Color get _foreground => switch (kind) {
        BadgeKind.success => AppColors.success,
        BadgeKind.warning => AppColors.warning,
        BadgeKind.danger => AppColors.danger,
        BadgeKind.sale => AppColors.goldLight,
        BadgeKind.rent => AppColors.goldLight,
        BadgeKind.neutral => AppColors.textSecondary,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _background,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: _foreground,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
