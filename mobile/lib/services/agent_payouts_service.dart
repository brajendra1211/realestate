import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/payout.dart';

class AgentPayoutsService {
  AgentPayoutsService(this._dio);

  final Dio _dio;

  Future<List<Payout>> getPayouts() async {
    try {
      final res = await _dio.get(Endpoints.agentPayouts);
      final data = res.data as List<dynamic>;
      return data.map((e) => Payout.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> requestPayout(int amount) async {
    try {
      await _dio.post(Endpoints.agentPayouts, data: {'amount': amount});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
