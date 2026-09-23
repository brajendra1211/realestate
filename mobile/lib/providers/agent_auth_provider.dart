import 'package:flutter/foundation.dart';

import '../services/auth_service.dart';

enum AuthStatus { unknown, loggedOut, loggedIn }

/// Tracks the agent's login state so the router's redirect guard
/// (`refreshListenable`) and the agent shell can react to it. Session
/// persistence itself lives in the Dio cookie jar — this provider just
/// mirrors whether a valid session currently exists.
class AgentAuthProvider extends ChangeNotifier {
  AgentAuthProvider(this._authService);

  final AuthService _authService;

  AuthStatus status = AuthStatus.unknown;
  String? userId;
  String? role;
  String? name;
  String? email;

  // NextAuth holds one session per cookie jar regardless of role — once
  // buyer/investor OTP login exists too (CustomerAuthProvider), a logged-in
  // buyer's session would otherwise also satisfy a plain "is anyone logged
  // in" check here and wrongly unlock agent-only routes.
  bool get isLoggedIn => status == AuthStatus.loggedIn && role == 'AGENT';

  /// Called once at startup (from the splash screen) to hydrate state from
  /// any persisted session cookie before the router evaluates redirects.
  Future<void> restoreSession() async {
    try {
      final session = await _authService.currentSession();
      _applySession(session);
    } catch (_) {
      status = AuthStatus.loggedOut;
    }
    notifyListeners();
  }

  Future<void> login({required String email, required String password}) async {
    await _authService.login(email: email, password: password);
    final session = await _authService.currentSession();
    _applySession(session);
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await _authService.logout();
    } catch (_) {
      // Best-effort server-side signout — the local session is cleared
      // below regardless, so the user is never stuck logged in on a
      // network hiccup or an unexpected NextAuth response.
    }
    status = AuthStatus.loggedOut;
    userId = null;
    role = null;
    name = null;
    email = null;
    notifyListeners();
  }

  void _applySession(Map<String, dynamic>? session) {
    final user = session?['user'];
    if (user is Map) {
      status = AuthStatus.loggedIn;
      userId = user['id']?.toString();
      role = user['role']?.toString();
      name = user['name']?.toString();
      email = user['email']?.toString();
    } else {
      status = AuthStatus.loggedOut;
      userId = null;
      role = null;
      name = null;
      email = null;
    }
  }
}
