import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

/// Groups related form fields into a white, elevated card with a Fraunces
/// section title (and an optional numbered step badge for multi-step
/// flows) — the "premium" form structure shared across the app, replacing
/// a flat unstructured field list.
class FormSection extends StatelessWidget {
  const FormSection({
    super.key,
    required this.title,
    required this.children,
    this.subtitle,
    this.stepNumber,
  });

  final String title;
  final String? subtitle;
  final int? stepNumber;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final gapped = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) gapped.add(const SizedBox(height: AppSpacing.md));
      gapped.add(children[i]);
    }

    return Container(
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (stepNumber != null) ...[
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: AppColors.primaryNavy,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '$stepNumber',
                    style: const TextStyle(
                      color: AppColors.goldLight,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
              ],
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: stepNumber != null ? 3 : 0),
                  child: Text(
                    title,
                    style: GoogleFonts.fraunces(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 3),
            Padding(
              padding: EdgeInsets.only(left: stepNumber != null ? 34 : 0),
              child: Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          ...gapped,
        ],
      ),
    );
  }
}
