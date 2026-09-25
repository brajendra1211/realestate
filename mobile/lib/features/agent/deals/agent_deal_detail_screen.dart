import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/deal.dart';
import '../../../services/agent_deals_service.dart';

class AgentDealDetailScreen extends StatefulWidget {
  const AgentDealDetailScreen({super.key, required this.dealId, required this.initial});

  final String dealId;
  final Deal initial;

  @override
  State<AgentDealDetailScreen> createState() => _AgentDealDetailScreenState();
}

class _AgentDealDetailScreenState extends State<AgentDealDetailScreen> {
  late final AgentDealsService _service;
  late Deal _deal;
  bool _advancing = false;

  @override
  void initState() {
    super.initState();
    _service = AgentDealsService(ApiClient.instance.dio);
    _deal = widget.initial;
  }

  int get _stageIndex => Deal.stages.indexOf(_deal.status);

  Future<void> _advanceTo(String status) async {
    int? tokenAmount;
    if (status == 'TOKEN_RECEIVED') {
      final controller = TextEditingController();
      final entered = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Token amount received'),
          content: TextField(
            controller: controller,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Amount (INR)'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(controller.text.trim()),
              child: const Text('Confirm'),
            ),
          ],
        ),
      );
      if (entered == null || !mounted) return;
      tokenAmount = int.tryParse(entered);
    }

    setState(() => _advancing = true);
    try {
      final updated = await _service.advanceStage(_deal.id, status, tokenAmount: tokenAmount);
      if (!mounted) return;
      setState(() => _deal = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Deal moved to ${status.replaceAll('_', ' ')}.')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _advancing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final deal = _deal;
    final nextStageIndex = _stageIndex + 1;
    final nextStage =
        nextStageIndex < Deal.stages.length ? Deal.stages[nextStageIndex] : null;

    return Scaffold(
      appBar: AppBar(title: Text(deal.propertyTitle ?? 'Deal')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.divider),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  Formatters.price(deal.dealValue),
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.gold),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    _InfoChip(
                      label: 'Buyer channel partner',
                      value: deal.buyerAgent?.agentCode ?? '—',
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _InfoChip(
                      label: 'Seller channel partner',
                      value: deal.sellerAgent?.agentCode ?? '—',
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Total commission ${Formatters.price(deal.totalCommission)} '
                  '(platform ${deal.platformPercent}% · you '
                  '${Formatters.price(deal.buyerCommission ?? deal.sellerCommission ?? 0)})',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Stage', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          ...Deal.stages.asMap().entries.map((entry) {
            final index = entry.key;
            final stage = entry.value;
            final reached = index <= _stageIndex;
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Row(
                children: [
                  Icon(
                    reached ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: reached ? AppColors.success : AppColors.textMuted,
                    size: 20,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    stage.replaceAll('_', ' '),
                    style: TextStyle(
                      fontWeight: reached ? FontWeight.w700 : FontWeight.w400,
                      color: reached ? AppColors.textPrimary : AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: AppSpacing.lg),
          if (deal.status == 'CANCELLED')
            const StatusBadge(label: 'CANCELLED', kind: BadgeKind.danger)
          else if (nextStage != null)
            AppButton(
              label: 'Advance to ${nextStage.replaceAll('_', ' ')}',
              expand: true,
              loading: _advancing,
              onPressed: () => _advanceTo(nextStage),
            )
          else
            const StatusBadge(label: 'CLOSED', kind: BadgeKind.success),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}
