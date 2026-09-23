import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/visit_log.dart';

class AgentVisitsService {
  AgentVisitsService(this._dio);

  final Dio _dio;

  Future<List<VisitLog>> getVisits() async {
    try {
      final res = await _dio.get(Endpoints.agentVisits);
      final data = res.data as List<dynamic>;
      return data.map((e) => VisitLog.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> requestOtp(String customerPhone) async {
    try {
      await _dio.post(Endpoints.agentVisitsOtp, data: {'customerPhone': customerPhone});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> logVisit({
    required String customerPhone,
    String? customerName,
    required String masterId,
    required String otp,
  }) async {
    try {
      await _dio.post(
        Endpoints.agentVisits,
        data: {
          'customerPhone': customerPhone,
          'customerName': ?customerName,
          'masterId': masterId,
          'otp': otp,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
