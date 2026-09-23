import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_rating.dart';

class AgentRatingsService {
  AgentRatingsService(this._dio);

  final Dio _dio;

  Future<AgentRatingsData> getRatings() async {
    try {
      final res = await _dio.get(Endpoints.agentRatings);
      return AgentRatingsData.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
