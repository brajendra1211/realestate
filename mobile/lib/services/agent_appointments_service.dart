import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/appointment.dart';

class AgentAppointmentsService {
  AgentAppointmentsService(this._dio);

  final Dio _dio;

  Future<List<Appointment>> getAppointments() async {
    try {
      final res = await _dio.get(Endpoints.agentAppointments);
      final data = res.data as List<dynamic>;
      return data
          .map((e) => Appointment.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> create({
    required String buyerId,
    String? masterId,
    required DateTime scheduledAt,
  }) async {
    try {
      await _dio.post(
        Endpoints.agentAppointments,
        data: {
          'buyerId': buyerId,
          'masterId': ?masterId,
          'scheduledAt': scheduledAt.toIso8601String(),
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> markAction(String id, String action) async {
    try {
      await _dio.post(Endpoints.agentAppointmentAction(id), data: {'action': action});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
