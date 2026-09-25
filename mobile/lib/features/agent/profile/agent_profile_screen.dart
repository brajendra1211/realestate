import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/agent_profile.dart';
import '../../../services/agent_service.dart';

class AgentProfileScreen extends StatefulWidget {
  const AgentProfileScreen({super.key});

  @override
  State<AgentProfileScreen> createState() => _AgentProfileScreenState();
}

class _AgentProfileScreenState extends State<AgentProfileScreen> {
  late final AgentService _service;
  late Future<AgentProfile> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentService(ApiClient.instance.dio);
    _future = _service.me();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: FutureBuilder<AgentProfile>(
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
              onRetry: () => setState(() => _future = _service.me()),
            );
          }

          final profile = snapshot.data!;
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
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            profile.agentCode ?? 'Pending Channel Partner Code',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  color: Colors.white,
                                ),
                          ),
                        ),
                        StatusBadge(
                          label: profile.status,
                          kind: profile.status == 'APPROVED'
                              ? BadgeKind.success
                              : profile.status == 'REJECTED'
                                  ? BadgeKind.danger
                                  : BadgeKind.warning,
                        ),
                      ],
                    ),
                    if (profile.status == 'REJECTED' &&
                        (profile.rejectionReason ?? '').isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Reason: ${profile.rejectionReason}',
                        style: const TextStyle(color: Color(0xFFE5A9A0), fontSize: 13),
                      ),
                    ],
                    const SizedBox(height: 2),
                    Text(
                      profile.primeStatus ? 'Prime member' : 'Standard member',
                      style: const TextStyle(color: Color(0xFFC6CEDB), fontSize: 13),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              _ProfileCard(
                title: 'Shop details',
                rows: [
                  _InfoRow(label: 'Shop name', value: profile.shopName ?? '—'),
                  _InfoRow(label: 'Shop address', value: profile.shopAddress ?? '—'),
                  _InfoRow(label: 'City', value: profile.city ?? '—'),
                  _InfoRow(label: 'Alternate phone', value: profile.alternatePhone ?? '—'),
                  _InfoRow(
                    label: 'Years of experience',
                    value: profile.yearsExperience?.toString() ?? '—',
                  ),
                  _InfoRow(label: 'Staff count', value: profile.staffCount?.toString() ?? '—'),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              _ProfileCard(
                title: 'Compliance & activity',
                rows: [
                  _InfoRow(label: 'RERA number', value: profile.reraNumber ?? '—'),
                  _InfoRow(label: 'GST number', value: profile.gstNumber ?? '—'),
                  _InfoRow(
                      label: 'Prime status', value: profile.primeStatus ? 'Active' : 'Not active'),
                  _InfoRow(label: 'Documents on file', value: '${profile.documents.length}'),
                  _InfoRow(label: 'Referral Partners referred', value: '${profile.investors.length}'),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.title, required this.rows});

  final String title;
  final List<_InfoRow> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) const Divider(height: AppSpacing.lg, color: AppColors.divider),
            rows[i],
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 160,
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
