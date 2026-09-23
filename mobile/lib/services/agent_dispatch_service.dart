import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/dispatch_request.dart';

class AgentDispatchService {
  AgentDispatchService(this._dio);

  final Dio _dio;

  Future<List<DispatchRequest>> getActiveDispatches() async {
    try {
      final res = await _dio.get(Endpoints.agentDispatch);
      final data = res.data as List<dynamic>;
      return data
          .map((e) => DispatchRequest.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> accept(String dispatchId) async {
    try {
      await _dio.post(Endpoints.dispatchAccept(dispatchId));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
