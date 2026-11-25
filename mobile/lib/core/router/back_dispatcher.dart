import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'route_paths.dart';

/// Android back button, step by step.
///
/// Most screens are opened with `context.go`, which replaces the whole stack, so the plain back
/// button had nothing to pop and closed the app. Order of handling:
///   1. Anything that can be popped (dialog, bottom sheet, pushed screen) is popped first.
///   2. Otherwise go to the screen "above" this one (see [parentOf]).
///   3. On the home screen, back asks to press again within 2 seconds before leaving the app.
class AppBackDispatcher extends RootBackButtonDispatcher {
  AppBackDispatcher(this.router, this.messengerKey);

  final GoRouter router;
  final GlobalKey<ScaffoldMessengerState> messengerKey;
  DateTime? _lastBack;

  @override
  Future<bool> didPopRoute() async {
    if (await super.didPopRoute()) return true;

    final path = router.routerDelegate.currentConfiguration.uri.path;
    final parent = parentOf(path);
    if (parent != null) {
      router.go(parent);
      return true;
    }

    final now = DateTime.now();
    final last = _lastBack;
    if (last != null && now.difference(last) < const Duration(seconds: 2)) return false; // leave the app
    _lastBack = now;
    messengerKey.currentState
      ?..clearSnackBars()
      ..showSnackBar(const SnackBar(content: Text('Press back again to exit'), duration: Duration(seconds: 2)));
    return true;
  }

  /// The screen to show when back is pressed on [path]; null means "this is the top: exit".
  static String? parentOf(String path) {
    if (path == RoutePaths.home || path == RoutePaths.splash || path.isEmpty) return null;

    // Sign-in sub-steps go back to their sign-in screen.
    if (path == RoutePaths.buyerVerify) return RoutePaths.buyerLogin;
    if (path == RoutePaths.investorVerify) return RoutePaths.investorLogin;
    if (path == RoutePaths.agentVerify ||
        path == RoutePaths.agentRegister ||
        path == RoutePaths.agentForgotPassword) {
      return RoutePaths.agentLogin;
    }
    if (path == RoutePaths.buyerLogin ||
        path == RoutePaths.investorLogin ||
        path == RoutePaths.agentLogin ||
        path == RoutePaths.ownerLogin ||
        path == RoutePaths.ownerStart ||
        path == RoutePaths.ownerStatus) {
      return RoutePaths.home;
    }
    if (path.startsWith('/owner/details/')) return RoutePaths.ownerStatus;

    // Inside a panel: sub-screens go to that panel's dashboard, the dashboard goes home.
    if (path == RoutePaths.agentListingNew) return RoutePaths.agentListings;
    if (path == RoutePaths.agentDashboard) return RoutePaths.home;
    if (path.startsWith('/agent/')) return RoutePaths.agentDashboard;
    if (path == RoutePaths.buyerDashboard) return RoutePaths.home;
    if (path.startsWith('/buyer/')) return RoutePaths.buyerDashboard;
    if (path == RoutePaths.investorDashboard) return RoutePaths.home;
    if (path.startsWith('/investor/')) return RoutePaths.investorDashboard;

    // Everything else (search, listing detail, shop, rate, account, support...) goes to the home screen.
    return RoutePaths.home;
  }
}
