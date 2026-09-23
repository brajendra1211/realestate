import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/dispatch_status.dart';

/// Uber-style cascade dispatch: a buyer requests the nearest available
/// agent, the backend cascades the request through widening radius batches
/// (5km → 10km → 25km), and the first agent to accept is matched.
///
/// Like `GoldListingSubmissionService`, this hits the live backend's
/// simulated (no-Razorpay) payment path — see the API parity plan.
class BuyerDispatchService {
  BuyerDispatchService(this._dio);

  final Dio _dio;

  /// Returns the new dispatch request's id. Throws
  /// `ApiException('payment_unavailable')` if the backend ever responds
  /// with the real-payment (non-simulated) branch.
  Future<String> requestDispatch(double latitude, double longitude) async {
    try {
      final res = await _dio.post(
        Endpoints.dispatchCreate,
        data: {'latitude': latitude, 'longitude': longitude},
      );
      final data = res.data as Map<String, dynamic>;
      final simulated = data['simulated'] as bool? ?? false;
      final id = data['dispatchRequestId'] as String?;
      if (!simulated || id == null) {
        throw const ApiException('payment_unavailable', null);
      }
      return id;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<DispatchStatus> getStatus(String id) async {
    try {
      final res = await _dio.get(Endpoints.dispatchDetail(id));
      return DispatchStatus.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> cancel(String id) async {
    try {
      await _dio.post(Endpoints.dispatchCancel(id));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
