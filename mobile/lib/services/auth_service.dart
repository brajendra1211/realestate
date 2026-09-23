import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';

/// The NextAuth cookie login flow: fetch a CSRF token, POST it with the
/// credentials to NextAuth's own callback route, then re-verify via
/// `/api/auth/session` — the callback's own response shape (redirect vs
/// JSON) varies by NextAuth version/config, so session re-verification is
/// the robust way to confirm login succeeded.
class AuthService {
  AuthService(this._dio);

  final Dio _dio;

  Future<void> login({required String email, required String password}) async {
    try {
      final csrfRes = await _dio.get(Endpoints.authCsrf);
      final csrfToken = (csrfRes.data as Map)['csrfToken'] as String;

      await _dio.post(
        Endpoints.authCallbackCredentials,
        data: {
          'email': email,
          'password': password,
          'csrfToken': csrfToken,
          'redirect': 'false',
          'json': 'true',
        },
        options: Options(
          contentType: Headers.formUrlEncodedContentType,
          validateStatus: (status) => status != null && status < 500,
        ),
      );

      final session = await currentSession();
      if (session == null || session['user'] == null) {
        throw const ApiException('invalid_credentials', 401);
      }
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// OTP request step for buyer/investor login (`endpoint` is
  /// `Endpoints.buyerOtpRequest` or `Endpoints.investorOtpRequest`) — the
  /// REST equivalent of the website's `requestBuyerOtp`/`requestInvestorOtp`
  /// server actions.
  Future<({String identifier, String channel})> requestOtp(
    String endpoint,
    String identifier,
  ) async {
    try {
      final res = await _dio.post(endpoint, data: {'identifier': identifier});
      final data = res.data as Map;
      return (
        identifier: data['identifier'] as String,
        channel: data['channel'] as String,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// OTP verify + sign-in (`provider` is `buyer-otp` or `investor-otp`) —
  /// goes straight through NextAuth's own generic credentials callback
  /// route, same mechanism as [login], just a different provider id/fields.
  Future<void> verifyOtp({
    required String provider,
    required String identifier,
    required String otp,
  }) async {
    try {
      final csrfRes = await _dio.get(Endpoints.authCsrf);
      final csrfToken = (csrfRes.data as Map)['csrfToken'] as String;

      await _dio.post(
        Endpoints.authCallback(provider),
        data: {
          'identifier': identifier,
          'otp': otp,
          'csrfToken': csrfToken,
          'redirect': 'false',
          'json': 'true',
        },
        options: Options(
          contentType: Headers.formUrlEncodedContentType,
          validateStatus: (status) => status != null && status < 500,
        ),
      );

      final session = await currentSession();
      if (session == null || session['user'] == null) {
        throw const ApiException('invalid_otp', 401);
      }
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Forgot-password step 2: the OTP (requested via the agent OTP endpoint)
  /// proves ownership, then the server replaces the password.
  Future<void> resetPassword({
    required String identifier,
    required String otp,
    required String password,
  }) async {
    try {
      await _dio.post(
        Endpoints.agentResetPassword,
        data: {'identifier': identifier, 'otp': otp, 'password': password},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>?> currentSession() async {
    try {
      final res = await _dio.get(Endpoints.authSession);
      final data = res.data;
      if (data is Map<String, dynamic> && data.isNotEmpty) return data;
      return null;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> logout() async {
    try {
      final csrfRes = await _dio.get(Endpoints.authCsrf);
      final csrfToken = (csrfRes.data as Map)['csrfToken'] as String;
      await _dio.post(
        Endpoints.authSignout,
        data: {
          'csrfToken': csrfToken,
          'redirect': 'false',
          'json': 'true',
        },
        options: Options(
          contentType: Headers.formUrlEncodedContentType,
          validateStatus: (status) => status != null && status < 500,
        ),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
