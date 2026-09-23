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
import '../../../models/dispatch_request.dart';
import '../../../services/agent_dispatch_service.dart';

class AgentDispatchListScreen extends StatefulWidget {
  const AgentDispatchListScreen({super.key});

  @override
  State<AgentDispatchListScreen> createState() => _AgentDispatchListScreenState();
}

class _AgentDispatchListScreenState extends State<AgentDispatchListScreen> {
  late final AgentDispatchService _service;
  late Future<List<DispatchRequest>> _future;
  String? _acceptingId;

  @override
  void initState() {
    super.initState();
    _service = AgentDispatchService(ApiClient.instance.dio);
    _future = _service.getActiveDispatches();
  }

  Future<void> _accept(String id) async {
    setState(() => _acceptingId = id);
    try {
      await _service.accept(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Lead accepted!')));
      setState(() => _future = _service.getActiveDispatches());
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _acceptingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nearby Leads')),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.getActiveDispatches()),
        child: FutureBuilder<List<DispatchRequest>>(
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
                onRetry: () => setState(() => _future = _service.getActiveDispatches()),
              );
            }
            final dispatches = snapshot.data ?? [];
            if (dispatches.isEmpty) {
              return const EmptyState(
                message: 'No active leads right now. New buyer requests near you will show up here.',
                icon: Icons.radar,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: dispatches.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final dispatch = dispatches[index];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: AppColors.primaryNavy,
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: const Icon(Icons.person_pin_circle_outlined,
                              color: AppColors.goldLight, size: 24),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Buyer request nearby', style: Theme.of(context).textTheme.titleMedium),
                              Text(
                                'Within ${dispatch.currentRadiusKm} km · ${Formatters.price(dispatch.amount)} lead fee',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        AppButton(
                          label: 'Accept',
                          loading: _acceptingId == dispatch.id,
                          onPressed: () => _accept(dispatch.id),
                        ),
                      ],
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
