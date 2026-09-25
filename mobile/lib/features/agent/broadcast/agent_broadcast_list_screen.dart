import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/broadcast.dart';
import '../../../services/agent_broadcast_service.dart';
import 'broadcast_create_screen.dart';
import 'broadcast_detail_chat_screen.dart';

class AgentBroadcastListScreen extends StatefulWidget {
  const AgentBroadcastListScreen({super.key});

  @override
  State<AgentBroadcastListScreen> createState() => _AgentBroadcastListScreenState();
}

class _AgentBroadcastListScreenState extends State<AgentBroadcastListScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  late final AgentBroadcastService _service;
  late Future<List<Broadcast>> _ownFuture;
  late Future<List<Broadcast>> _nearbyFuture;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _service = AgentBroadcastService(ApiClient.instance.dio);
    _ownFuture = _service.getOwn();
    _nearbyFuture = _service.getNearby();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _respond(Broadcast broadcast) async {
    try {
      await _service.respond(broadcast.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Response sent to the requesting channel partner')));
      setState(() => _nearbyFuture = _service.getNearby());
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('B2B Broadcasts'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: 'Own'), Tab(text: 'Nearby')],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.textOnGold,
        onPressed: () async {
          final created = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const BroadcastCreateScreen()),
          );
          if (created == true) {
            setState(() => _ownFuture = _service.getOwn());
          }
        },
        child: const Icon(Icons.campaign_outlined),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOwnTab(),
          _buildNearbyTab(),
        ],
      ),
    );
  }

  Widget _buildOwnTab() {
    return FutureBuilder<List<Broadcast>>(
      future: _ownFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator(color: AppColors.gold));
        }
        if (snapshot.hasError) {
          final message = snapshot.error is ApiException
              ? errorMessageFor(snapshot.error as ApiException)
              : 'Something went wrong.';
          return ErrorView(message: message, onRetry: () => setState(() => _ownFuture = _service.getOwn()));
        }
        final broadcasts = snapshot.data ?? [];
        if (broadcasts.isEmpty) {
          return const EmptyState(
            message: 'You haven\'t posted any B2B requirements yet.',
            icon: Icons.campaign_outlined,
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.lg),
          itemCount: broadcasts.length,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
          itemBuilder: (context, index) {
            final b = broadcasts[index];
            return Card(
              child: ListTile(
                title: Text('${b.flatSize} · ${b.txnType}'),
                subtitle: Text(
                  '${Formatters.price(b.budgetMin)} - ${Formatters.price(b.budgetMax)} · '
                  '${b.responses.length} responses',
                ),
                trailing: b.status == 'OPEN'
                    ? IconButton(
                        icon: const Icon(Icons.close),
                        tooltip: 'Close',
                        onPressed: () async {
                          await _service.close(b.id);
                          if (!mounted) return;
                          setState(() => _ownFuture = _service.getOwn());
                        },
                      )
                    : const StatusBadge(label: 'Closed', kind: BadgeKind.neutral),
                onTap: b.responses.isEmpty
                    ? null
                    : () => _pickResponderAndChat(b),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _pickResponderAndChat(Broadcast b) async {
    final responder = await showDialog<BroadcastResponse>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Chat with'),
        children: b.responses
            .map((r) => SimpleDialogOption(
                  onPressed: () => Navigator.of(context).pop(r),
                  child: Text(r.agentCode ?? r.agentId),
                ))
            .toList(),
      ),
    );
    if (responder == null || !mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BroadcastDetailChatScreen(
          broadcastId: b.id,
          otherAgentId: responder.agentId,
          otherAgentLabel: responder.agentCode ?? responder.agentId,
        ),
      ),
    );
  }

  Widget _buildNearbyTab() {
    return FutureBuilder<List<Broadcast>>(
      future: _nearbyFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator(color: AppColors.gold));
        }
        if (snapshot.hasError) {
          // The backend returns a generic "Unauthorized" here for a
          // logged-in agent who isn't APPROVED+Prime yet (not just for a
          // missing session) — the nearby-broadcast feed is Prime-gated.
          final message = snapshot.error is ApiException &&
                  (snapshot.error as ApiException).code == 'Unauthorized'
              ? 'Nearby broadcasts require an approved Prime channel partner account.'
              : snapshot.error is ApiException
                  ? errorMessageFor(snapshot.error as ApiException)
                  : 'Something went wrong.';
          return ErrorView(
              message: message, onRetry: () => setState(() => _nearbyFuture = _service.getNearby()));
        }
        final broadcasts = snapshot.data ?? [];
        if (broadcasts.isEmpty) {
          return const EmptyState(
            message: 'No nearby B2B requirements right now. '
                '(Requires your shop location to be set.)',
            icon: Icons.campaign_outlined,
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.lg),
          itemCount: broadcasts.length,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
          itemBuilder: (context, index) {
            final b = broadcasts[index];
            return Card(
              child: ListTile(
                title: Text('${b.flatSize} · ${b.txnType} · ${b.agentCode ?? ""}'),
                subtitle: Text(
                  '${Formatters.price(b.budgetMin)} - ${Formatters.price(b.budgetMax)} · '
                  '${b.distanceKm?.toStringAsFixed(1) ?? "?"} km away',
                ),
                trailing: AppButton(label: 'Respond', onPressed: () => _respond(b)),
              ),
            );
          },
        );
      },
    );
  }
}
