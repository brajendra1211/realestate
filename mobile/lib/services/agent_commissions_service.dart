import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/commission_entry.dart';

class AgentCommissionsService {
  AgentCommissionsService(this._dio);

  final Dio _dio;

  Future<CommissionsData> getCommissions() async {
    try {
      final res = await _dio.get(Endpoints.agentCommissions);
      return CommissionsData.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
