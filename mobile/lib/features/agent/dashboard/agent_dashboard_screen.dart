import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/agent_profile.dart';
import '../../../providers/agent_auth_provider.dart';
import '../../../services/agent_service.dart';

class AgentDashboardScreen extends StatefulWidget {
  const AgentDashboardScreen({super.key});

  @override
  State<AgentDashboardScreen> createState() => _AgentDashboardScreenState();
}

class _AgentDashboardScreenState extends State<AgentDashboardScreen> {
  late final AgentService _service;
  late Future<AgentProfile> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentService(ApiClient.instance.dio);
    _future = _service.me();
  }

  BadgeKind _statusKind(String status) => switch (status) {
        'APPROVED' => BadgeKind.success,
        'REJECTED' => BadgeKind.danger,
        _ => BadgeKind.warning,
      };

  @override
  Widget build(BuildContext context) {
    final agentAuth = context.watch<AgentAuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => agentAuth.logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.me()),
        child: FutureBuilder<AgentProfile>(
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
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              profile.shopName ?? agentAuth.name ?? 'Agent',
                              style: Theme.of(context).textTheme.headlineMedium,
                            ),
                          ),
                          StatusBadge(
                            label: profile.status,
                            kind: _statusKind(profile.status),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        profile.agentCode ?? 'Agent code pending approval',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceAlt,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                        child: Row(
                          children: [
                            _StatTile(
                              icon: Icons.account_balance_wallet_outlined,
                              label: 'Wallet',
                              value: Formatters.price(profile.walletBalance),
                            ),
                            const _StatDivider(),
                            _StatTile(
                              icon: Icons.star_rounded,
                              label: 'Rating',
                              value: profile.ratingAvg.toStringAsFixed(1),
                            ),
                            const _StatDivider(),
                            _StatTile(
                              icon: Icons.workspace_premium_outlined,
                              label: 'Prime',
                              value: profile.primeStatus ? 'Yes' : 'No',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),

                // --- AGENT SHOP QR CODE HERO CARD ---
                InkWell(
                  onTap: () => context.push(RoutePaths.agentShopQr),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primaryNavy, AppColors.navyLight],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.qr_code_2_rounded,
                            color: AppColors.goldLight,
                            size: 32,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'My Shop QR Code',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Tap to view, copy link & download standee',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Colors.white70,
                                      fontSize: 11.5,
                                    ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.arrow_forward_ios_rounded,
                          color: Colors.white70,
                          size: 15,
                        ),
                      ],
                    ),
                  ),
                ),

                if (!profile.canCreateListings) ...[
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.goldLight.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Text(
                      profile.status != 'APPROVED'
                          ? 'Your application is pending admin approval. Some features unlock after approval.'
                          : 'Activate Prime to create listings and add investors.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                Text('Quick links', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: AppSpacing.sm,
                  crossAxisSpacing: AppSpacing.sm,
                  childAspectRatio: 1.6,
                  children: [
                    _QuickLink(
                      icon: Icons.qr_code_2_rounded,
                      label: 'Shop QR Code',
                      onTap: () => context.push(RoutePaths.agentShopQr),
                    ),
                    _QuickLink(
                      icon: Icons.home_work_outlined,
                      label: 'My Listings',
                      onTap: () => context.push(RoutePaths.agentListings),
                    ),
                    _QuickLink(
                      icon: Icons.groups_outlined,
                      label: 'Investors',
                      onTap: () => context.push(RoutePaths.agentInvestors),
                    ),
                    _QuickLink(
                      icon: Icons.account_balance_wallet_outlined,
                      label: 'Commissions',
                      onTap: () => context.push(RoutePaths.agentCommissions),
                    ),
                    _QuickLink(
                      icon: Icons.folder_outlined,
                      label: 'Documents',
                      onTap: () => context.push(RoutePaths.agentDocuments),
                    ),
                    _QuickLink(
                      icon: Icons.person_outline,
                      label: 'My Profile',
                      onTap: () => context.push(RoutePaths.agentProfile),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 16, color: AppColors.gold),
          const SizedBox(height: 2),
          Text(value, style: Theme.of(context).textTheme.titleMedium),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _StatDivider extends StatelessWidget {
  const _StatDivider();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 36,
      child: VerticalDivider(color: AppColors.divider, width: 1),
    );
  }
}

class _QuickLink extends StatelessWidget {
  const _QuickLink({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.primaryNavy,
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(icon, color: AppColors.goldLight, size: 18),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
