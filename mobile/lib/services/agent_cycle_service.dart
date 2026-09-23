import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_cycle_progress.dart';

class AgentCycleService {
  AgentCycleService(this._dio);

  final Dio _dio;

  Future<AgentCycleProgress> getProgress() async {
    try {
      final res = await _dio.get(Endpoints.agentCycle);
      return AgentCycleProgress.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET and POST share the same path — POST issues the 20% pre-expiry
  /// renewal coupon.
  Future<CycleCoupon> claimCoupon() async {
    try {
      final res = await _dio.post(Endpoints.agentCycle);
      return CycleCoupon.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
