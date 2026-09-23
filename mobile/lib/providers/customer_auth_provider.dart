import 'package:flutter/foundation.dart';

import '../core/network/endpoints.dart';
import '../services/auth_service.dart';

enum CustomerAuthStatus { unknown, loggedOut, loggedIn }

/// Shared OTP session state for the buyer and investor roles — NextAuth
/// holds one session per cookie jar, so there is only ever one "current
/// customer" (or none) at a time; [role] says which. Kept separate from
/// [AgentAuthProvider] (a different login mechanism — email/password vs
/// OTP — and a different route-gating concern) rather than merged into it.
class CustomerAuthProvider extends ChangeNotifier {
  CustomerAuthProvider(this._authService);

  final AuthService _authService;

  CustomerAuthStatus status = CustomerAuthStatus.unknown;
  String? userId;
  String? role;
  String? name;
  String? email;
  String? phone;

  bool get isBuyer =>
      status == CustomerAuthStatus.loggedIn && role == 'BUYER';
  bool get isInvestor =>
      status == CustomerAuthStatus.loggedIn && role == 'INVESTOR';

  Future<void> restoreSession() async {
    try {
      final session = await _authService.currentSession();
      _applySession(session);
    } catch (_) {
      status = CustomerAuthStatus.loggedOut;
    }
    notifyListeners();
  }

  Future<({String identifier, String channel})> requestOtp({
    required bool forInvestor,
    required String identifier,
  }) {
    return _authService.requestOtp(
      forInvestor ? Endpoints.investorOtpRequest : Endpoints.buyerOtpRequest,
      identifier,
    );
  }

  Future<void> verifyOtp({
    required bool forInvestor,
    required String identifier,
    required String otp,
  }) async {
    await _authService.verifyOtp(
      provider: forInvestor ? 'investor-otp' : 'buyer-otp',
      identifier: identifier,
      otp: otp,
    );
    final session = await _authService.currentSession();
    _applySession(session);
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await _authService.logout();
    } catch (_) {
      // Best-effort server-side signout — local session clears regardless.
    }
    status = CustomerAuthStatus.loggedOut;
    userId = null;
    role = null;
    name = null;
    email = null;
    phone = null;
    notifyListeners();
  }

  void _applySession(Map<String, dynamic>? session) {
    final user = session?['user'];
    if (user is Map) {
      status = CustomerAuthStatus.loggedIn;
      userId = user['id']?.toString();
      role = user['role']?.toString();
      name = user['name']?.toString();
      email = user['email']?.toString();
      phone = user['phone']?.toString();
    } else {
      status = CustomerAuthStatus.loggedOut;
      userId = null;
      role = null;
      name = null;
      email = null;
      phone = null;
    }
  }
}
