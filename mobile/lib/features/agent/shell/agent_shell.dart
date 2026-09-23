import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_paths.dart';
import '../../../core/widgets/nav_dock.dart';

const _items = [
  NavDockItem(icon: Icons.dashboard_rounded, label: 'Dashboard'),
  NavDockItem(icon: Icons.home_work_rounded, label: 'Listings'),
  NavDockItem(icon: Icons.radar_rounded, label: 'Dispatch'),
  NavDockItem(icon: Icons.grid_view_rounded, label: 'More'),
];

/// Bottom-nav shell for the authenticated agent section: Dashboard,
/// Listings, Dispatch, and a More grid housing the rest.
class AgentShell extends StatelessWidget {
  const AgentShell({super.key, required this.child});

  final Widget child;

  int _indexForLocation(String location) {
    if (location.startsWith(RoutePaths.agentListings)) return 1;
    if (location.startsWith(RoutePaths.agentDispatch)) return 2;
    if (location.startsWith(RoutePaths.agentMore)) return 3;
    return 0;
  }

  void _onTap(BuildContext context, int index) => switch (index) {
        0 => context.go(RoutePaths.agentDashboard),
        1 => context.go(RoutePaths.agentListings),
        2 => context.go(RoutePaths.agentDispatch),
        _ => context.go(RoutePaths.agentMore),
      };

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
