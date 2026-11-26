import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/agent/shell/agent_drawer.dart';
import '../router/back_dispatcher.dart';

/// Goes one step back: pops the screen if it was pushed, otherwise opens the screen "above" it.
void goOneStepBack(BuildContext context) {
  final nav = Navigator.of(context);
  if (nav.canPop()) {
    nav.pop();
    return;
  }
  final path = GoRouterState.of(context).uri.path;
  final parent = AppBackDispatcher.parentOf(path);
  if (parent != null) context.go(parent);
}

/// App bar with a back arrow on every screen (except the very first one).
/// Same arguments as the usual [AppBar] for the ones this app uses.
class BackAppBar extends StatelessWidget implements PreferredSizeWidget {
  const BackAppBar({
    super.key,
    this.title,
    this.actions,
    this.bottom,
    this.leading,
    this.backgroundColor,
    this.foregroundColor,
    this.elevation,
    this.centerTitle,
    this.showBack = true,
  });

  final Widget? title;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  final Widget? leading;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double? elevation;
  final bool? centerTitle;
  final bool showBack;

  @override
  Size get preferredSize => Size.fromHeight(kToolbarHeight + (bottom?.preferredSize.height ?? 0));

  @override
  Widget build(BuildContext context) {
    Widget? lead = leading;
    if (lead == null && showBack) {
      String path = '';
      try {
        path = GoRouterState.of(context).uri.path;
      } catch (_) {}
      // Partner sidebar screens get their back arrow from the partner shell (next to the menu button).
      final shellHasIt = agentSidebarPaths.contains(path);
      final canGoBack = !shellHasIt && (Navigator.of(context).canPop() || AppBackDispatcher.parentOf(path) != null);
      if (canGoBack) {
        lead = IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          tooltip: 'Back',
          onPressed: () => goOneStepBack(context),
        );
      }
    }
    return AppBar(
      leading: lead,
      automaticallyImplyLeading: false,
      title: title,
      actions: actions,
      bottom: bottom,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      elevation: elevation,
      centerTitle: centerTitle,
    );
  }
}
