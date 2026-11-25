import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';

/// Registration OTP check: verifies the WhatsApp code once and returns a short-lived
/// proof that the register endpoints accept instead of the code.
class OtpService {
  OtpService(this._dio);
  final Dio _dio;

  Future<String> verifyPhone(String phone, String code) async {
    try {
      final res = await _dio.post('/api/otp/verify', data: {'phone': phone, 'code': code});
      return (res.data as Map)['proof'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
