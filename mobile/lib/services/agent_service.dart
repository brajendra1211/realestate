import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_lookup_result.dart';
import '../models/agent_profile.dart';
import '../models/agent_registration_result.dart';

class AgentService {
  AgentService(this._dio);

  final Dio _dio;

  Future<AgentProfile> me() async {
    try {
      final res = await _dio.get(Endpoints.agentMe);
      return AgentProfile.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AgentRegistrationResult> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? alternatePhone,
    required String shopName,
    required String shopAddress,
    required String city,
    int? yearsExperience,
    int? staffCount,
    String? reraNumber,
    String? gstNumber,
    String? referredByAgentCode,
  }) async {
    try {
      final res = await _dio.post(
        Endpoints.agentRegister,
        data: {
          'name': name,
          'email': email,
          'password': password,
          'phone': ?phone,
          'alternatePhone': ?alternatePhone,
          'shopName': shopName,
          'shopAddress': shopAddress,
          'city': city,
          'yearsExperience': ?yearsExperience,
          'staffCount': ?staffCount,
          'reraNumber': ?reraNumber,
          'gstNumber': ?gstNumber,
          'documents': const [],
          'referredByAgentCode': ?referredByAgentCode,
        },
      );
      return AgentRegistrationResult.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Requires any logged-in session — do not call from pre-auth screens
  /// like registration.
  Future<AgentLookupResult> lookupByCode(String code) async {
    try {
      final res = await _dio.get(
        Endpoints.agentLookup,
        queryParameters: {'code': code},
      );
      return AgentLookupResult.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
