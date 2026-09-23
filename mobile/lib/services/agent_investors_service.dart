import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/investor_profile.dart';

class AgentInvestorsService {
  AgentInvestorsService(this._dio);

  final Dio _dio;

  Future<List<InvestorProfile>> getInvestors() async {
    try {
      final res = await _dio.get(Endpoints.agentInvestors);
      final data = res.data as List<dynamic>;
      return data
          .map((e) => InvestorProfile.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> addInvestor({
    required String name,
    required String email,
    required String phone,
  }) async {
    try {
      await _dio.post(
        Endpoints.agentInvestors,
        data: {'name': name, 'email': email, 'phone': phone},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
