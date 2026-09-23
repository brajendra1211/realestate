import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/commission_entry.dart';
import '../../../services/agent_commissions_service.dart';

class AgentCommissionsScreen extends StatefulWidget {
  const AgentCommissionsScreen({super.key});

  @override
  State<AgentCommissionsScreen> createState() => _AgentCommissionsScreenState();
}

class _AgentCommissionsScreenState extends State<AgentCommissionsScreen> {
  late final AgentCommissionsService _service;
  late Future<CommissionsData> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentCommissionsService(ApiClient.instance.dio);
    _future = _service.getCommissions();
  }

  String _typeLabel(String type) => type
      .split('_')
      .map((w) => w.isEmpty ? w : '${w[0]}${w.substring(1).toLowerCase()}')
      .join(' ');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Commissions')),
      body: FutureBuilder<CommissionsData>(
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
              onRetry: () => setState(() => _future = _service.getCommissions()),
            );
          }

          final data = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.primaryNavy,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Total earned',
                      style: TextStyle(color: Color(0xFFC6CEDB), fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      Formatters.price(data.grandTotal),
                      style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: data.totals.entries
                    .where((e) => e.value > 0)
                    .map((e) => Container(
                          padding:
                              const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(AppRadius.pill),
                            border: Border.all(color: AppColors.divider),
                          ),
                          child: Text(
                            '${_typeLabel(e.key)}: ${Formatters.price(e.value)}',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ))
                    .toList(),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('History', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              if (data.entries.isEmpty)
                const EmptyState(
                  message: 'No commission entries yet.',
                  icon: Icons.account_balance_wallet_outlined,
                )
              else
                ...data.entries.map((entry) => Card(
                      child: ListTile(
                        title: Text(_typeLabel(entry.type)),
                        subtitle: entry.note != null ? Text(entry.note!) : null,
                        trailing: Text(
                          Formatters.price(entry.amount),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: AppColors.success,
                              ),
                        ),
                      ),
                    )),
            ],
          );
        },
      ),
    );
  }
}
