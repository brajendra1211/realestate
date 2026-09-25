import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/router/route_paths.dart';
import '../../../core/widgets/nav_dock.dart';
import '../../../providers/agent_auth_provider.dart';

const _items = [
  NavDockItem(icon: Icons.home_rounded, label: 'Home'),
  NavDockItem(icon: Icons.search_rounded, label: 'Explore'),
  NavDockItem(icon: Icons.bar_chart_rounded, label: 'Ranking'),
  NavDockItem(icon: Icons.badge_outlined, label: 'Channel Partner'),
];

/// Bottom-nav shell for the public/consumer section: Home, Explore
/// (search), a role-aware "Agent" entry point (gated by login state, not
/// a persistent tab of its own), and a placeholder Account tab.
class ConsumerShell extends StatelessWidget {
  const ConsumerShell({super.key, required this.child});

  final Widget child;

  int _indexForLocation(String location) {
    if (location.startsWith(RoutePaths.search)) return 1;
    if (location.startsWith(RoutePaths.leaderboard)) return 2;
    return 0;
  }

  void _onTap(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go(RoutePaths.home);
      case 1:
        context.go(RoutePaths.search);
      case 2:
        context.go(RoutePaths.leaderboard);
      case 3:
        final agentAuth = context.read<AgentAuthProvider>();
        context.push(
          agentAuth.isLoggedIn
              ? RoutePaths.agentDashboard
              : RoutePaths.agentLogin,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();

    return Scaffold(
      body: child,
      bottomNavigationBar: NavDock(
        items: _items,
        currentIndex: _indexForLocation(location),
        onTap: (index) => _onTap(context, index),
      ),
    );
  }
}
