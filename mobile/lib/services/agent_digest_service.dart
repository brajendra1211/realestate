import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_digest.dart';

class AgentDigestService {
  AgentDigestService(this._dio);

  final Dio _dio;

  Future<AgentDigest> getDigest() async {
    try {
      final res = await _dio.get(Endpoints.agentDigest);
      return AgentDigest.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
