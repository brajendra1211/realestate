import 'package:dio/dio.dart';

/// Wraps the backend's `{ "error": "<code>" }` failure envelope into a
/// typed exception every service throws instead of a raw [DioException].
class ApiException implements Exception {
  const ApiException(this.code, this.statusCode);

  final String code;
  final int? statusCode;

  factory ApiException.fromDioError(DioException e) {
    final data = e.response?.data;
    String code = 'network_error';
    if (data is Map && data['error'] != null) {
      code = data['error'].toString();
    } else if (e.response != null) {
      code = 'unknown_error';
    }
    return ApiException(code, e.response?.statusCode);
  }

  @override
  String toString() => 'ApiException($code, status: $statusCode)';
}
