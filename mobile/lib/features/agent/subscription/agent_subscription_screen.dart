import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/form_section.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/agent_plan.dart';
import '../../../models/agent_subscription_status.dart';
import '../../../services/agent_subscription_service.dart';

class AgentSubscriptionScreen extends StatefulWidget {
  const AgentSubscriptionScreen({super.key});

  @override
  State<AgentSubscriptionScreen> createState() => _AgentSubscriptionScreenState();
}

class _AgentSubscriptionScreenState extends State<AgentSubscriptionScreen> {
  late final AgentSubscriptionService _service;
  late Future<AgentSubscriptionStatus> _statusFuture;
  late Future<List<AgentPlanDefinition>> _plansFuture;
  final _vpaController = TextEditingController();
  bool _savingMandate = false;

  @override
  void initState() {
    super.initState();
    _service = AgentSubscriptionService(ApiClient.instance.dio);
    _reload();
  }

  void _reload() {
    _statusFuture = _service.getStatus();
    _plansFuture = _service.getPlans();
  }

  @override
  void dispose() {
    _vpaController.dispose();
    super.dispose();
  }

  Future<void> _saveMandate() async {
    final vpa = _vpaController.text.trim();
    if (vpa.isEmpty || !vpa.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid UPI ID, e.g. name@upi.')),
      );
      return;
    }
    setState(() => _savingMandate = true);
    try {
      await _service.setAutopayMandate(vpa);
      if (!mounted) return;
      setState(_reload);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Auto-pay mandate saved.')));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _savingMandate = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => setState(_reload),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            FutureBuilder<AgentSubscriptionStatus>(
              future: _statusFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                    child: Center(child: CircularProgressIndicator(color: AppColors.gold)),
                  );
                }
                if (snapshot.hasError) {
                  final message = snapshot.error is ApiException
                      ? errorMessageFor(snapshot.error as ApiException)
                      : 'Something went wrong.';
                  return ErrorView(message: message, onRetry: () => setState(_reload));
                }
                return _StatusCard(status: snapshot.data!);
              },
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              'Plans',
              style: GoogleFonts.fraunces(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            FutureBuilder<List<AgentPlanDefinition>>(
              future: _plansFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.gold));
                }
                if (snapshot.hasError) return const SizedBox.shrink();
                final plans = snapshot.data ?? [];
                return Column(
                  children: plans
                      .map((p) => Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: _PlanCard(plan: p),
                          ))
                      .toList(),
                );
              },
            ),
            const SizedBox(height: AppSpacing.xl),
            FormSection(
              title: 'Auto-pay mandate',
              subtitle: "Link a UPI ID as backup so renewal doesn't lapse if your "
                  'wallet balance runs low.',
              children: [
                TextFormField(
                  controller: _vpaController,
                  decoration: const InputDecoration(
                    labelText: 'UPI ID (e.g. name@upi)',
                    prefixIcon: Icon(Icons.account_balance_outlined),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: 'Save mandate',
              expand: true,
              loading: _savingMandate,
              onPressed: _saveMandate,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.status});

  final AgentSubscriptionStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.primaryNavy,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusBadge(
                label: status.planTier,
                kind: status.planTier == 'PRIME' ? BadgeKind.success : BadgeKind.neutral,
              ),
              const SizedBox(width: AppSpacing.sm),
              if (status.agentCode != null)
                Text(
                  status.agentCode!,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _StatTile(label: 'Wallet', value: '₹${status.walletBalance}'),
              ),
              Expanded(
                child: _StatTile(label: 'Days left', value: '${status.daysRemaining}'),
              ),
            ],
          ),
          if (status.renewalAlertActive) ...[
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: const Text(
                'Renewing soon — top up your wallet to avoid losing visibility.',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ],
          if (status.visibilityDeprioritized) ...[
            const SizedBox(height: AppSpacing.sm),
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: const Text(
                'Your listings are currently deprioritized in search.',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ],
          if (status.autoPayActive && status.autoPayMandate != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Auto-pay: ${status.autoPayMandate}',
              style: const TextStyle(color: Color(0xFFC6CEDB), fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value,
            style: const TextStyle(
                color: AppColors.goldLight, fontSize: 20, fontWeight: FontWeight.w700)),
        Text(label, style: const TextStyle(color: Color(0xFFC6CEDB), fontSize: 12)),
      ],
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan});

  final AgentPlanDefinition plan;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(plan.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  '${plan.durationDays}-day validity · up to ${plan.listingLimit} listings',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Text(
                  '₹${plan.referralAmount} referral split per sign-up',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Text(
            '₹${plan.price}',
            style: const TextStyle(
                color: AppColors.gold, fontWeight: FontWeight.w700, fontSize: 18),
          ),
        ],
      ),
    );
  }
}
