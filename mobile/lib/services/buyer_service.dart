import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/buyer_appointment.dart';
import '../models/buyer_profile.dart';

class BuyerService {
  BuyerService(this._dio);

  final Dio _dio;

  Future<BuyerMe> getMe() async {
    try {
      final res = await _dio.get(Endpoints.buyerMe);
      return BuyerMe.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateProfile({
    required String name,
    String? email,
    String? phone,
  }) async {
    try {
      await _dio.put(
        Endpoints.buyerMe,
        data: {'name': name, 'email': ?email, 'phone': ?phone},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<bool> toggleSavedProperty(String propertyId) async {
    try {
      final res = await _dio.post(
        Endpoints.buyerSavedProperties,
        data: {'propertyId': propertyId},
      );
      return (res.data as Map)['saved'] as bool;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<BuyerAppointment>> getAppointments() async {
    try {
      final res = await _dio.get(Endpoints.buyerAppointments);
      final data = res.data as List<dynamic>;
      return data.map((e) => BuyerAppointment.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> markNoShow(String appointmentId) async {
    try {
      await _dio.post(Endpoints.buyerAppointmentNoShow(appointmentId));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> switchAgent({
    required String fromAgentId,
    required String reason,
    required bool isComplaint,
    required double latitude,
    required double longitude,
  }) async {
    try {
      await _dio.post(
        Endpoints.buyerSwitchAgent,
        data: {
          'fromAgentId': fromAgentId,
          'reason': reason,
          'isComplaint': isComplaint,
          'latitude': latitude,
          'longitude': longitude,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
