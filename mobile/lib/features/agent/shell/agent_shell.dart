import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../buzzer/agent_buzzer_overlay.dart';
import 'agent_drawer.dart';

/// Shell for the authenticated partner section: a sidebar (drawer) lists every module,
/// opened with the menu button on each top-level screen. The buzzer is mounted here so it
/// rings on any screen.
class AgentShell extends StatelessWidget {
  const AgentShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final path = location.split('?').first;
    final topLevel = agentSidebarPaths.contains(path);

    // Top-level screens have no back arrow, so the menu button takes that slot and the
    // title moves right to make room for it.
    final themed = topLevel
        ? Theme(
            data: Theme.of(context).copyWith(
              appBarTheme: Theme.of(context).appBarTheme.copyWith(titleSpacing: 64),
            ),
            child: child,
          )
        : child;

    return Scaffold(
      drawer: AgentDrawer(location: location),
      body: AgentBuzzerOverlay(
        child: Stack(
          children: [
            themed,
            if (topLevel)
              Positioned(
                left: 10,
                top: MediaQuery.of(context).padding.top + 6,
                child: Builder(
                  builder: (ctx) => Material(
                    color: Colors.white,
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(color: AppColors.gold.withValues(alpha: 0.35)),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => Scaffold.of(ctx).openDrawer(),
                      child: const SizedBox(
                        width: 42,
                        height: 42,
                        child: Icon(Icons.menu_rounded, color: AppColors.gold, semanticLabel: 'Open menu'),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
