import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_card.dart';

class AgentMoreScreen extends StatelessWidget {
  const AgentMoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: GridView.count(
        padding: const EdgeInsets.all(AppSpacing.lg),
        crossAxisCount: 2,
        mainAxisSpacing: AppSpacing.sm,
        crossAxisSpacing: AppSpacing.sm,
        childAspectRatio: 1.6,
        children: [
          _MoreTile(
            icon: Icons.person_outline,
            label: 'My Profile',
            onTap: () => context.push(RoutePaths.agentProfile),
          ),
          _MoreTile(
            icon: Icons.qr_code_2_rounded,
            label: 'Shop QR Code',
            onTap: () => context.push(RoutePaths.agentShopQr),
          ),
          _MoreTile(
            icon: Icons.workspace_premium_outlined,
            label: 'Subscription',
            onTap: () => context.push(RoutePaths.agentSubscription),
          ),
          _MoreTile(
            icon: Icons.flag_outlined,
            label: '60-Day Cycle',
            onTap: () => context.push(RoutePaths.agentCycle),
          ),
          _MoreTile(
            icon: Icons.handshake_outlined,
            label: 'B2B Deals',
            onTap: () => context.push(RoutePaths.agentDeals),
          ),
          _MoreTile(
            icon: Icons.account_balance_wallet_outlined,
            label: 'Commissions',
            onTap: () => context.push(RoutePaths.agentCommissions),
          ),
          _MoreTile(
            icon: Icons.groups_outlined,
            label: 'Investors',
            onTap: () => context.push(RoutePaths.agentInvestors),
          ),
          _MoreTile(
            icon: Icons.folder_outlined,
            label: 'Documents',
            onTap: () => context.push(RoutePaths.agentDocuments),
          ),
          _MoreTile(
            icon: Icons.star_border,
            label: 'Gold Feed',
            onTap: () => context.push(RoutePaths.agentGoldListings),
          ),
          _MoreTile(
            icon: Icons.qr_code_scanner_outlined,
            label: 'Visits',
            onTap: () => context.push(RoutePaths.agentVisits),
          ),
          _MoreTile(
            icon: Icons.payments_outlined,
            label: 'Payouts',
            onTap: () => context.push(RoutePaths.agentPayouts),
          ),
          _MoreTile(
            icon: Icons.reviews_outlined,
            label: 'Ratings',
            onTap: () => context.push(RoutePaths.agentRatings),
          ),
          _MoreTile(
            icon: Icons.summarize_outlined,
            label: 'Digest',
            onTap: () => context.push(RoutePaths.agentDigest),
          ),
          _MoreTile(
            icon: Icons.campaign_outlined,
            label: 'B2B Broadcast',
            onTap: () => context.push(RoutePaths.agentBroadcast),
          ),
          _MoreTile(
            icon: Icons.event_available_outlined,
            label: 'Appointments',
            onTap: () => context.push(RoutePaths.agentAppointments),
          ),
        ],
      ),
    );
  }
}

class _MoreTile extends StatelessWidget {
  const _MoreTile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.primaryNavy,
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(icon, color: AppColors.goldLight, size: 20),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
