import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/payout.dart';
import '../../../services/agent_payouts_service.dart';

class AgentPayoutsScreen extends StatefulWidget {
  const AgentPayoutsScreen({super.key});

  @override
  State<AgentPayoutsScreen> createState() => _AgentPayoutsScreenState();
}

class _AgentPayoutsScreenState extends State<AgentPayoutsScreen> {
  late final AgentPayoutsService _service;
  late Future<List<Payout>> _future;
  bool _requesting = false;

  @override
  void initState() {
    super.initState();
    _service = AgentPayoutsService(ApiClient.instance.dio);
    _future = _service.getPayouts();
  }

  BadgeKind _statusKind(String status) => switch (status) {
        'PAID' => BadgeKind.success,
        'REJECTED' => BadgeKind.danger,
        _ => BadgeKind.warning,
      };

  Future<void> _requestPayout() async {
    final amountController = TextEditingController();
    final amount = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request payout'),
        content: TextField(
          controller: amountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount (INR)'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(amountController.text.trim()),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    final parsed = int.tryParse(amount ?? '');
    if (parsed == null || parsed <= 0 || !mounted) return;

    setState(() => _requesting = true);
    try {
      await _service.requestPayout(parsed);
      if (!mounted) return;
      setState(() => _future = _service.getPayouts());
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payouts')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.textOnGold,
        onPressed: _requesting ? null : _requestPayout,
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.getPayouts()),
        child: FutureBuilder<List<Payout>>(
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
                onRetry: () => setState(() => _future = _service.getPayouts()),
              );
            }
            final payouts = snapshot.data ?? [];
            if (payouts.isEmpty) {
              return const EmptyState(
                message: 'No payout requests yet. Tap + to request one.',
                icon: Icons.payments_outlined,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: payouts.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final payout = payouts[index];
                return Card(
                  child: ListTile(
                    title: Text(
                      Formatters.price(payout.netAmount),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    subtitle: Text(
                      'Gross ${Formatters.price(payout.grossAmount)} · TDS ${Formatters.price(payout.tdsAmount)}',
                    ),
                    trailing: StatusBadge(label: payout.status, kind: _statusKind(payout.status)),
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
