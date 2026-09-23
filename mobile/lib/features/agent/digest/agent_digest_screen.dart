import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/agent_digest.dart';
import '../../../services/agent_digest_service.dart';

class AgentDigestScreen extends StatefulWidget {
  const AgentDigestScreen({super.key});

  @override
  State<AgentDigestScreen> createState() => _AgentDigestScreenState();
}

class _AgentDigestScreenState extends State<AgentDigestScreen> {
  late final AgentDigestService _service;
  late Future<AgentDigest> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentDigestService(ApiClient.instance.dio);
    _future = _service.getDigest();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Today's Digest")),
      body: FutureBuilder<AgentDigest>(
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
              onRetry: () => setState(() => _future = _service.getDigest()),
            );
          }
          final digest = snapshot.data!;
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
                  children: [
                    const Text(
                      'New listings in last 24h',
                      style: TextStyle(color: Color(0xFFC6CEDB), fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${digest.totalCount}',
                      style: const TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const Text(
                      'within 10km of your shop',
                      style: TextStyle(color: Color(0xFFC6CEDB), fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (digest.groups.isEmpty)
                const EmptyState(
                  message: 'No new listings nearby in the last 24 hours.',
                  icon: Icons.summarize_outlined,
                )
              else
                ...digest.groups.map((g) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Card(
                        child: ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceAlt,
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: const Icon(Icons.location_city, color: AppColors.gold, size: 20),
                          ),
                          title: Text(g.locality, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(g.bedrooms != null ? '${g.bedrooms}BHK' : 'Mixed configs'),
                          trailing: Text(
                            '${g.count}',
                            style: Theme.of(context).textTheme.titleMedium,
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
