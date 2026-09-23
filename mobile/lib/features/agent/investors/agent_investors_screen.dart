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
import '../../../models/investor_profile.dart';
import '../../../services/agent_investors_service.dart';
import 'agent_investor_form_screen.dart';

class AgentInvestorsScreen extends StatefulWidget {
  const AgentInvestorsScreen({super.key});

  @override
  State<AgentInvestorsScreen> createState() => _AgentInvestorsScreenState();
}

class _AgentInvestorsScreenState extends State<AgentInvestorsScreen> {
  late final AgentInvestorsService _service;
  late Future<List<InvestorProfile>> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentInvestorsService(ApiClient.instance.dio);
    _future = _service.getInvestors();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Investors')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.textOnGold,
        onPressed: () async {
          final added = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const AgentInvestorFormScreen()),
          );
          if (added == true) {
            setState(() => _future = _service.getInvestors());
          }
        },
        child: const Icon(Icons.person_add_outlined),
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.getInvestors()),
        child: FutureBuilder<List<InvestorProfile>>(
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
                onRetry: () => setState(() => _future = _service.getInvestors()),
              );
            }
            final investors = snapshot.data ?? [];
            if (investors.isEmpty) {
              return const EmptyState(
                message: 'No investors yet. Tap + to add one.',
                icon: Icons.groups_outlined,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: investors.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final investor = investors[index];
                return Card(
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.primaryNavy,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: const Icon(Icons.groups_outlined, color: AppColors.goldLight, size: 20),
                    ),
                    title: Text(
                      investor.investorCode ?? 'Pending investor code',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Invested: ${Formatters.price(investor.totalInvested)} · '
                      '${investor.profitDistributionCount} distributions',
                    ),
                    trailing: StatusBadge(
                      label: investor.feeStatus,
                      kind: investor.feeStatus == 'PAID' ? BadgeKind.success : BadgeKind.warning,
                    ),
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
