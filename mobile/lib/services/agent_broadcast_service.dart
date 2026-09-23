import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/broadcast.dart';

class AgentBroadcastService {
  AgentBroadcastService(this._dio);

  final Dio _dio;

  Future<List<Broadcast>> getNearby() async {
    try {
      final res = await _dio.get(Endpoints.agentBroadcast);
      final data = res.data as List<dynamic>;
      return data.map((e) => Broadcast.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Broadcast>> getOwn() async {
    try {
      final res = await _dio.get(Endpoints.agentBroadcastOwn);
      final data = res.data as List<dynamic>;
      return data.map((e) => Broadcast.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getNearbySocieties({int radiusKm = 1}) async {
    try {
      final res = await _dio.get(
        Endpoints.agentBroadcastSocieties,
        queryParameters: {'radiusKm': radiusKm},
      );
      return (res.data as List<dynamic>).map((e) => e.toString()).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> create({
    required int radiusKm,
    String? society,
    required String flatSize,
    required String txnType,
    required int budgetMin,
    required int budgetMax,
  }) async {
    try {
      await _dio.post(
        Endpoints.agentBroadcast,
        data: {
          'radiusKm': radiusKm,
          'society': ?society,
          'flatSize': flatSize,
          'txnType': txnType,
          'budgetMin': budgetMin,
          'budgetMax': budgetMax,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> respond(String broadcastId) async {
    try {
      await _dio.post(Endpoints.agentBroadcastRespond(broadcastId));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> close(String broadcastId) async {
    try {
      await _dio.post(Endpoints.agentBroadcastClose(broadcastId));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<AgentChatMessage>> getChat(String broadcastId, String otherAgentId) async {
    try {
      final res = await _dio.get(Endpoints.agentBroadcastChat(broadcastId, otherAgentId));
      final data = res.data as List<dynamic>;
      return data.map((e) => AgentChatMessage.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> sendChatMessage(String broadcastId, String otherAgentId, String message) async {
    try {
      await _dio.post(
        Endpoints.agentBroadcastChat(broadcastId, otherAgentId),
        data: {'message': message},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
