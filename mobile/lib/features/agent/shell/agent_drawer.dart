import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../providers/agent_auth_provider.dart';

class _Item {
  const _Item(this.icon, this.label, this.path, {this.push = false});
  final IconData icon;
  final String label;
  final String path;
  final bool push; // opens outside the shell (has its own back button)
}

class _Group {
  const _Group(this.title, this.items);
  final String? title;
  final List<_Item> items;
}

const _groups = [
  _Group(null, [_Item(Icons.dashboard_outlined, 'Dashboard', RoutePaths.agentDashboard)]),
  _Group('Work', [
    _Item(Icons.notifications_active_outlined, 'Owner Requests', RoutePaths.agentOwnerRequests),
    _Item(Icons.person_search_outlined, 'Buyer Leads', RoutePaths.agentBuyerLeads),
    _Item(Icons.radar_outlined, 'Dispatch', RoutePaths.agentDispatch),
    _Item(Icons.home_work_outlined, 'My Listings', RoutePaths.agentListings),
    _Item(Icons.star_outline_rounded, 'Direct Customer Listings', RoutePaths.agentGoldListings),
    _Item(Icons.event_outlined, 'Appointments', RoutePaths.agentAppointments),
    _Item(Icons.place_outlined, 'Site Visits', RoutePaths.agentVisits),
    _Item(Icons.cell_tower_outlined, 'B2B Broadcast', RoutePaths.agentBroadcast),
    _Item(Icons.article_outlined, 'Daily Digest', RoutePaths.agentDigest),
    _Item(Icons.travel_explore_outlined, 'Customer Requirements', RoutePaths.agentRequirements),
    _Item(Icons.apartment_outlined, 'Office Visits', RoutePaths.agentOfficeVisits),
    _Item(Icons.description_outlined, 'Brochure Maker', RoutePaths.agentBrochures),
  ]),
  _Group('Money', [
    _Item(Icons.account_balance_wallet_outlined, 'Earnings & Payouts', RoutePaths.agentPayouts),
    _Item(Icons.receipt_long_outlined, 'Commissions', RoutePaths.agentCommissions),
    _Item(Icons.workspace_premium_outlined, 'Subscription', RoutePaths.agentSubscription),
  ]),
  _Group('My network', [
    _Item(Icons.groups_outlined, 'Referral Partners', RoutePaths.agentInvestors),
    _Item(Icons.handshake_outlined, 'B2B Deals', RoutePaths.agentDeals),
  ]),
  _Group('Performance', [
    _Item(Icons.flag_outlined, '60-Day Cycle', RoutePaths.agentCycle),
    _Item(Icons.star_half_rounded, 'Ratings', RoutePaths.agentRatings),
    _Item(Icons.qr_code_2_rounded, 'Shop QR Code', RoutePaths.agentShopQr),
  ]),
  _Group('Account', [
    _Item(Icons.person_outline, 'Profile & KYC', RoutePaths.agentProfile),
    _Item(Icons.folder_open_outlined, 'Documents', RoutePaths.agentDocuments),
    _Item(Icons.settings_outlined, 'Settings', RoutePaths.agentSettings),
    _Item(Icons.support_agent_outlined, 'Support & disputes', RoutePaths.support, push: true),
  ]),
];

/// Every route reachable from the sidebar (used by the shell to know when to show the menu button).
final Set<String> agentSidebarPaths = {
  for (final g in _groups)
    for (final i in g.items)
      if (!i.push) i.path,
};

/// Light sidebar for the partner app: brand, signed-in partner, every module in one grouped list.
class AgentDrawer extends StatelessWidget {
  const AgentDrawer({super.key, required this.location});
  final String location;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AgentAuthProvider>();
    final name = auth.name ?? 'Channel Partner';
    final t = Theme.of(context).textTheme;

    return Drawer(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      width: 304,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [AppColors.gold, AppColors.goldSoft]),
                      borderRadius: BorderRadius.circular(13),
                      boxShadow: [BoxShadow(color: AppColors.gold.withValues(alpha: 0.35), blurRadius: 14)],
                    ),
                    child: const Text('p', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('pronesto.', style: t.headlineMedium?.copyWith(color: AppColors.goldDark, fontWeight: FontWeight.w700)),
                      Row(
                        children: [
                          Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF00E676), shape: BoxShape.circle)),
                          const SizedBox(width: 5),
                          Text('CHANNEL PARTNER', style: t.bodySmall?.copyWith(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.4, color: AppColors.goldSoft)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                children: [
                  for (final g in _groups) ...[
                    if (g.title != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 16, 12, 6),
                        child: Text(
                          g.title!.toUpperCase(),
                          style: t.bodySmall?.copyWith(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.6, color: AppColors.textMuted),
                        ),
                      ),
                    for (final i in g.items) _tile(context, i),
                  ],
                ],
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Container(
                padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFFFFE14D), Color(0xFFFFB300)]),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(name.characters.first.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF04050D))),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: t.bodyMedium?.copyWith(fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                          Text('● Channel Partner', style: t.bodySmall?.copyWith(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.success)),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () async {
                        final router = GoRouter.of(context);
                        Navigator.of(context).pop();
                        await auth.logout();
                        router.go(RoutePaths.home);
                      },
                      child: const Text('Log out', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFFD81B9A))),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tile(BuildContext context, _Item item) {
    final path = location.split('?').first;
    final active = !item.push && (path == item.path || path.startsWith('${item.path}/'));
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1.5),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            final router = GoRouter.of(context);
            Navigator.of(context).pop();
            if (item.push) {
              router.push(item.path);
            } else {
              router.go(item.path);
            }
          },
          child: Ink(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            decoration: active
                ? BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFFE0F2FF), Color(0xFFEEF4FF), Color(0xFFEDE7FF)]),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.7)),
                    boxShadow: [BoxShadow(color: const Color(0xFF0099FF).withValues(alpha: 0.25), blurRadius: 14)],
                  )
                : null,
            child: Row(
              children: [
                Icon(item.icon, size: 20, color: active ? AppColors.gold : AppColors.textMuted),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: active ? AppColors.goldDark : AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
