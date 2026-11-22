import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../core/payments/razorpay_checkout.dart';
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
      final body = {'latitude': latitude, 'longitude': longitude};
      final res = await _dio.post(Endpoints.dispatchCreate, data: body);
      final data = res.data as Map<String, dynamic>;
      final order = data['order'] as Map?;
      if (order == null) throw const ApiException('payment_unavailable', null);
      final paid = await openRazorpayCheckout(
        keyId: data['keyId'] as String,
        orderId: order['id'] as String,
        amountPaise: (order['amount'] as num).toInt(),
        description: 'Nearest partner request',
      );
      if (paid == null) throw const ApiException('Payment cancelled.', null);
      final done = await _dio.post('/api/dispatch/verify', data: {
        ...body,
        'razorpayOrderId': paid.orderId,
        'razorpayPaymentId': paid.paymentId,
        'razorpaySignature': paid.signature,
      });
      return (done.data as Map)['dispatchRequestId'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } on String catch (message) {
      throw ApiException(message, null);
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
