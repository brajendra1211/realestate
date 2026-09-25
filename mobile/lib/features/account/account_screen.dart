import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../core/router/route_paths.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../providers/agent_auth_provider.dart';
import '../../providers/customer_auth_provider.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final agentAuth = context.watch<AgentAuthProvider>();
    final customerAuth = context.watch<CustomerAuthProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            Text(
              'Sign in',
              style: GoogleFonts.fraunces(
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Choose how you use BayaEstate.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.lg),
            _AccountOption(
              icon: Icons.person_outline,
              title: 'Buyer',
              subtitle: customerAuth.isBuyer
                  ? 'Signed in as ${customerAuth.name ?? customerAuth.email ?? customerAuth.phone ?? 'buyer'}'
                  : 'Save properties, track enquiries, book visits.',
              signedIn: customerAuth.isBuyer,
              onTap: () => context.push(
                customerAuth.isBuyer ? RoutePaths.buyerDashboard : RoutePaths.buyerLogin,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _AccountOption(
              icon: Icons.trending_up,
              title: 'Referral Partner',
              subtitle: customerAuth.isInvestor
                  ? 'Signed in as ${customerAuth.name ?? customerAuth.email ?? customerAuth.phone ?? 'investor'}'
                  : 'Track your capital, profit ledger, and documents.',
              signedIn: customerAuth.isInvestor,
              onTap: () => context.push(
                customerAuth.isInvestor
                    ? RoutePaths.investorDashboard
                    : RoutePaths.investorLogin,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _AccountOption(
              icon: Icons.badge_outlined,
              title: 'Channel Partner',
              subtitle: agentAuth.isLoggedIn
                  ? 'Signed in as ${agentAuth.name ?? 'agent'}'
                  : 'Manage listings, leads, and commissions.',
              signedIn: agentAuth.isLoggedIn,
              onTap: () => context.push(
                agentAuth.isLoggedIn ? RoutePaths.agentDashboard : RoutePaths.agentLogin,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountOption extends StatelessWidget {
  const _AccountOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.signedIn,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool signedIn;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.divider),
          ),
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
                child: Icon(icon, color: AppColors.goldLight, size: 22),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (signedIn) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: AppColors.success,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}
