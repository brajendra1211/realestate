import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_plan.dart';
import '../models/agent_subscription_status.dart';

class AgentSubscriptionService {
  AgentSubscriptionService(this._dio);

  final Dio _dio;

  /// Public endpoint — no session required.
  Future<List<AgentPlanDefinition>> getPlans() async {
    try {
      final res = await _dio.get(Endpoints.agentSubscriptionPlans);
      return (res.data as List<dynamic>)
          .map((e) => AgentPlanDefinition.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AgentSubscriptionStatus> getStatus() async {
    try {
      final res = await _dio.get(Endpoints.agentSubscriptionStatus);
      return AgentSubscriptionStatus.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> setAutopayMandate(String vpa) async {
    try {
      await _dio.post(
        Endpoints.agentSubscriptionAutopayMandate,
        data: {'vpa': vpa},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
