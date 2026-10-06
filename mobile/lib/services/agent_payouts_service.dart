import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_payment_history.dart';
import '../models/payout.dart';

class AgentPayoutsService {
  AgentPayoutsService(this._dio);

  final Dio _dio;

  Future<AgentPaymentHistory> getPaymentHistory() async {
    try {
      final res = await _dio.get(Endpoints.agentPayments);
      return AgentPaymentHistory.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

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
