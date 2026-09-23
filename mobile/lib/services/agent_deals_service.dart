import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/deal.dart';

class AgentDealsService {
  AgentDealsService(this._dio);

  final Dio _dio;

  Future<List<Deal>> getDeals() async {
    try {
      final res = await _dio.get(Endpoints.agentDeals);
      return (res.data as List<dynamic>)
          .map((e) => Deal.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Deal> createDeal({
    required int dealValue,
    int? totalCommission,
    String? buyerAgentId,
    String? sellerAgentId,
    String? broadcastId,
    String? propertyTitle,
    String? note,
    String paymentMode = 'BANK_TRANSFER',
  }) async {
    try {
      final res = await _dio.post(
        Endpoints.agentDeals,
        data: {
          'dealValue': dealValue,
          'totalCommission': ?totalCommission,
          'buyerAgentId': ?buyerAgentId,
          'sellerAgentId': ?sellerAgentId,
          'broadcastId': ?broadcastId,
          'propertyTitle': ?propertyTitle,
          'note': ?note,
          'paymentMode': paymentMode,
        },
      );
      return Deal.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Deal> advanceStage(
    String id,
    String status, {
    int? tokenAmount,
    String? note,
  }) async {
    try {
      final res = await _dio.patch(
        Endpoints.agentDealStage(id),
        data: {
          'status': status,
          'tokenAmount': ?tokenAmount,
          'note': ?note,
        },
      );
      return Deal.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
