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
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() { _future = _service.me(); }),
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
                onRetry: () => setState(() { _future = _service.me(); }),
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
                              profile.shopName ?? agentAuth.name ?? 'Channel Partner',
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
                        profile.agentCode ?? 'Channel Partner code pending approval',
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Complete your setup',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          profile.status != 'APPROVED'
                              ? 'Upload your documents and choose a plan. Pay to get approved instantly, or wait for admin approval (24-48 hours).'
                              : 'Choose a plan and pay to activate your Channel Partner code and create listings.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () => context.push(RoutePaths.agentDocuments),
                            icon: const Icon(Icons.upload_file_outlined),
                            label: Text(profile.documents.isEmpty
                                ? 'Upload documents (KYC)'
                                : 'Documents (${profile.documents.length} uploaded)'),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: () => context.push(RoutePaths.agentSubscription),
                            icon: const Icon(Icons.workspace_premium_outlined),
                            label: const Text('Choose plan & pay'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                Text('Today\'s work', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                _QuickLink(
                  icon: Icons.notifications_active_outlined,
                  label: 'Owner Requests',
                  hint: 'Verify properties and earn your share',
                  color: const Color(0xFF00C8FF),
                  onTap: () => context.go(RoutePaths.agentOwnerRequests),
                ),
                _QuickLink(
                  icon: Icons.person_search_outlined,
                  label: 'Buyer Leads',
                  hint: 'Buyers who paid to see a property',
                  color: const Color(0xFF00C46A),
                  onTap: () => context.go(RoutePaths.agentBuyerLeads),
                ),
                _QuickLink(
                  icon: Icons.home_work_outlined,
                  label: 'My Listings',
                  hint: 'Properties live under your code',
                  color: const Color(0xFF8B5CFF),
                  onTap: () => context.go(RoutePaths.agentListings),
                ),
                const SizedBox(height: AppSpacing.md),
                Text('Money & growth', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                _QuickLink(
                  icon: Icons.account_balance_wallet_outlined,
                  label: 'Commissions',
                  hint: 'Your wallet and earnings',
                  color: const Color(0xFFFFB300),
                  onTap: () => context.go(RoutePaths.agentCommissions),
                ),
                _QuickLink(
                  icon: Icons.groups_outlined,
                  label: 'Referral Partners',
                  hint: 'People you brought in',
                  color: const Color(0xFFFF2BD6),
                  onTap: () => context.go(RoutePaths.agentInvestors),
                ),
                _QuickLink(
                  icon: Icons.qr_code_2_rounded,
                  label: 'Shop QR Code',
                  hint: 'Share your listings link',
                  color: const Color(0xFF0A6CFF),
                  onTap: () => context.go(RoutePaths.agentShopQr),
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
  const _QuickLink({
    required this.icon,
    required this.label,
    required this.hint,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String hint;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.md),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: color.withValues(alpha: 0.35)),
              boxShadow: [BoxShadow(color: color.withValues(alpha: 0.14), blurRadius: 14, offset: const Offset(0, 4))],
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(13),
                    border: Border.all(color: color.withValues(alpha: 0.4)),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: t.bodyMedium?.copyWith(fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                      const SizedBox(height: 1),
                      Text(hint, style: t.bodySmall),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: color),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
