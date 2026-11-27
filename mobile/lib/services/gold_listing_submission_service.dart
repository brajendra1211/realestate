import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../core/payments/razorpay_checkout.dart';

/// Customer self-service "Gold" listing submission — distinct from
/// [AgentGoldListingsService], which is the agent's incoming CRM feed of
/// already-approved gold listings, not the buyer-facing submission flow.
///
/// The live backend runs the simulated (no Razorpay) path, matching
/// `PublicListingsService.unlockListing` elsewhere in the app — see the API
/// parity plan for why we don't add a payment SDK here.
class GoldListingSubmissionService {
  GoldListingSubmissionService(this._dio);

  final Dio _dio;

  Future<String> uploadImage(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });
      final res = await _dio.post(Endpoints.goldListingsUploadImage, data: formData);
      return (res.data as Map<String, dynamic>)['url'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Returns the created listing's slug. Throws `ApiException('payment_unavailable')`
  /// if the backend ever responds with the real-payment (non-simulated) branch.
  Future<String> submit({
    required String address,
    required String city,
    required String title,
    required String description,
    required String listingType,
    required String propertyType,
    int? bedrooms,
    int? bathrooms,
    int? areaSqft,
    required int price,
    String? locality,
    String? amenities,
    String? videoUrl,
    List<String>? images,
    String? referredByAgentCode,
  }) async {
    try {
      final res = await _dio.post(
        Endpoints.goldListingsCreate,
        data: {
          'address': address,
          'city': city,
          'title': title,
          'description': description,
          'listingType': listingType,
          'propertyType': propertyType,
          'bedrooms': ?bedrooms,
          'bathrooms': ?bathrooms,
          'areaSqft': ?areaSqft,
          'price': price,
          'locality': ?locality,
          'amenities': ?amenities,
          'videoUrl': ?videoUrl,
          'images': ?images,
          'referredByAgentCode': ?referredByAgentCode,
        },
      );
      final data = res.data as Map<String, dynamic>;
      final order = data['order'] as Map?;
      if (order == null) throw const ApiException('payment_unavailable', null);
      final paid = await openRazorpayCheckout(
        keyId: data['keyId'] as String,
        orderId: order['id'] as String,
        amountPaise: (order['amount'] as num).toInt(),
        description: 'Gold property listing',
      );
      if (paid == null) throw const ApiException('Payment cancelled.', null);
      final done = await _dio.post(Endpoints.goldListingsVerify, data: {
        'input': data['input'],
        'razorpayOrderId': paid.orderId,
        'razorpayPaymentId': paid.paymentId,
        'razorpaySignature': paid.signature,
      });
      return (done.data as Map)['slug'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } on String catch (message) {
      throw ApiException(message, null);
    }
  }
}
