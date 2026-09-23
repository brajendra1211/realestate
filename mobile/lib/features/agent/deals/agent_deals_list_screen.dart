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
import '../../../models/deal.dart';
import '../../../services/agent_deals_service.dart';
import 'agent_deal_detail_screen.dart';

class AgentDealsListScreen extends StatefulWidget {
  const AgentDealsListScreen({super.key});

  @override
  State<AgentDealsListScreen> createState() => _AgentDealsListScreenState();
}

class _AgentDealsListScreenState extends State<AgentDealsListScreen> {
  late final AgentDealsService _service;
  late Future<List<Deal>> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentDealsService(ApiClient.instance.dio);
    _future = _service.getDeals();
  }

  void _reload() => setState(() => _future = _service.getDeals());

  BadgeKind _statusKind(String status) => switch (status) {
        'CLOSED' || 'REGISTRY_COMPLETED' => BadgeKind.success,
        'CANCELLED' => BadgeKind.danger,
        _ => BadgeKind.warning,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('B2B Deals')),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => _reload(),
        child: FutureBuilder<List<Deal>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: AppColors.gold));
            }
            if (snapshot.hasError) {
              final message = snapshot.error is ApiException
                  ? errorMessageFor(snapshot.error as ApiException)
                  : 'Something went wrong.';
              return ErrorView(message: message, onRetry: _reload);
            }
            final deals = snapshot.data ?? [];
            if (deals.isEmpty) {
              return const EmptyState(
                message: 'No deals yet. Start one from a broadcast chat.',
                icon: Icons.handshake_outlined,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: deals.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final deal = deals[index];
                return Card(
                  child: ListTile(
                    title: Text(
                      deal.propertyTitle ?? Formatters.price(deal.dealValue),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      '${Formatters.price(deal.dealValue)} · '
                      '${[deal.buyerAgent?.agentCode, deal.sellerAgent?.agentCode].where((s) => s != null).join(' ↔ ')}',
                    ),
                    trailing: StatusBadge(
                      label: deal.status,
                      kind: _statusKind(deal.status),
                    ),
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => AgentDealDetailScreen(dealId: deal.id, initial: deal),
                        ),
                      );
                      _reload();
                    },
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
