import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';

class PushService {
  PushService(this._dio);

  final Dio _dio;

  /// Registers this device's FCM token against the logged-in user so the
  /// server can ring it (src/lib/push.ts). Best-effort — a failure here
  /// shouldn't block login.
  Future<void> registerToken(String token) async {
    try {
      await _dio.post(Endpoints.pushRegister, data: {'token': token, 'platform': 'ANDROID'});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
