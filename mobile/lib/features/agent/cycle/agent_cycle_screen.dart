import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/agent_cycle_progress.dart';
import '../../../services/agent_cycle_service.dart';

class AgentCycleScreen extends StatefulWidget {
  const AgentCycleScreen({super.key});

  @override
  State<AgentCycleScreen> createState() => _AgentCycleScreenState();
}

class _AgentCycleScreenState extends State<AgentCycleScreen> {
  late final AgentCycleService _service;
  late Future<AgentCycleProgress> _future;
  bool _claiming = false;

  @override
  void initState() {
    super.initState();
    _service = AgentCycleService(ApiClient.instance.dio);
    _future = _service.getProgress();
  }

  Future<void> _claimCoupon() async {
    setState(() => _claiming = true);
    try {
      await _service.claimCoupon();
      if (!mounted) return;
      setState(() => _future = _service.getProgress());
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Coupon claimed!')));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('60-Day Review Cycle')),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => setState(() => _future = _service.getProgress()),
        child: FutureBuilder<AgentCycleProgress>(
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
                onRetry: () => setState(() => _future = _service.getProgress()),
              );
            }
            final progress = snapshot.data!;
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                Row(
                  children: [
                    StatusBadge(
                      label: progress.trafficLight,
                      kind: switch (progress.trafficLight) {
                        'GREEN' => BadgeKind.success,
                        'RED' => BadgeKind.danger,
                        _ => BadgeKind.warning,
                      },
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      '${progress.daysRemaining} days remaining',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                _TargetRow(
                  label: 'Listings',
                  achieved: progress.achieved.listings,
                  target: progress.targets.listings,
                ),
                _TargetRow(
                  label: 'Deals',
                  achieved: progress.achieved.deals,
                  target: progress.targets.deals,
                ),
                _TargetRow(
                  label: 'Site visits',
                  achieved: progress.achieved.visits,
                  target: progress.targets.visits,
                ),
                _TargetRow(
                  label: 'Customer properties',
                  achieved: progress.achieved.customerProperties,
                  target: progress.targets.customerProperties,
                ),
                _TargetRow(
                  label: 'Referral Partners',
                  achieved: progress.achieved.investors,
                  target: progress.targets.investors,
                ),
                _TargetRow(
                  label: 'Direct channel partners',
                  achieved: progress.achieved.directAgents,
                  target: progress.targets.directAgents,
                ),
                const SizedBox(height: AppSpacing.lg),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.emoji_events_outlined, color: AppColors.gold),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          'Carry-forward score: ${progress.carryForwardScore} '
                          '· ${progress.cycleCompletedCount} cycles completed',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (progress.coupon != null)
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.local_offer_outlined, color: AppColors.success),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            '${progress.coupon!.discountPercent}% off renewal — code '
                            '${progress.coupon!.code}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                  )
                else if (progress.isTargetMet)
                  AppButton(
                    label: 'Claim 20% renewal coupon',
                    expand: true,
                    loading: _claiming,
                    onPressed: _claimCoupon,
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TargetRow extends StatelessWidget {
  const _TargetRow({required this.label, required this.achieved, required this.target});

  final String label;
  final int achieved;
  final int target;

  @override
  Widget build(BuildContext context) {
    final ratio = target == 0 ? 0.0 : (achieved / target).clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('$achieved / $target', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 8,
              backgroundColor: AppColors.surfaceAlt,
              color: ratio >= 1 ? AppColors.success : AppColors.gold,
            ),
          ),
        ],
      ),
    );
  }
}
