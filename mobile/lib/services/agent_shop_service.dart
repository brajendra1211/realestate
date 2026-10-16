import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_shop.dart';

class AgentShopService {
  AgentShopService(this._dio);

  final Dio _dio;

  /// Fetches agent shop profile, unlock status, and properties.
  Future<AgentShopResponse> getAgentShop(String agentCode, {String? phone}) async {
    try {
      final res = await _dio.get(
        Endpoints.agentShop(agentCode.trim().toUpperCase()),
        queryParameters: {
          if (phone != null && phone.isNotEmpty) 'phone': phone,
        },
      );
      return AgentShopResponse.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Initiates ₹50 Razorpay payment order for the agent shop.
  Future<Map<String, dynamic>> createUnlockOrder(
    String agentCode, {
    String? phone,
  }) async {
    try {
      final res = await _dio.post(
        Endpoints.agentShopUnlockOrder(agentCode.trim().toUpperCase()),
        data: {
          if (phone != null && phone.isNotEmpty) 'customerPhone': phone,
        },
      );
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Verifies payment signature and unlocks the shop.
  Future<Map<String, dynamic>> verifyUnlock(
    String agentCode, {
    String? orderId,
    String? paymentId,
    String? signature,
    String? phone,
  }) async {
    try {
      final res = await _dio.post(
        Endpoints.agentShopUnlockVerify(agentCode.trim().toUpperCase()),
        data: {
          'razorpayOrderId': ?orderId,
          'razorpayPaymentId': ?paymentId,
          'razorpaySignature': ?signature,
          if (phone != null && phone.isNotEmpty) 'customerPhone': phone,
        },
      );
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Fire-and-forget: lets nearby channel partners know a buyer just scanned
  /// this QR. Never throws — a failed/slow alert must never block the scan
  /// flow from continuing to the shop screen.
  Future<void> sendNearbyAlert(String agentCode, {required double latitude, required double longitude}) async {
    try {
      await _dio.post(
        Endpoints.agentShopNearbyAlert(agentCode.trim().toUpperCase()),
        data: {'latitude': latitude, 'longitude': longitude},
      );
    } catch (_) {
      // Best-effort only.
    }
  }
}
