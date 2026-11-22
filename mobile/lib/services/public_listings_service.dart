import '../core/payments/razorpay_checkout.dart';
import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/listing_detail.dart';
import '../models/public_listing.dart';

class PublicListingsService {
  PublicListingsService(this._dio);

  final Dio _dio;

  // `verifiedOnly`/`sinceDays` are NOT backend query params — the real
  // GET /api/listings only accepts city/listingType. "Verified agents" and
  // "New this week" filtering happens client-side instead (see
  // home_screen.dart), using the real `agentVerified`/`createdAt` fields
  // already present on every listing this returns.
  Future<List<PublicListingSummary>> getListings({
    String? city,
    String? listingType,
  }) async {
    try {
      final res = await _dio.get(
        Endpoints.listings,
        queryParameters: {
          if (city?.isNotEmpty ?? false) 'city': city,
          'listingType': ?listingType,
        },
      );
      final data = res.data as List<dynamic>;
      return data
          .map((e) => PublicListingSummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Urgent (≤ 30 days left on the owner agreement) listings, sorted by
  /// soonest expiry — reuses [PublicListingSummary] since the raw
  /// `AgentListing` shape this returns is a superset of what `/api/listings`
  /// already gives us (see `home_screen.dart`'s `computeAgreementUrgency`,
  /// which already renders the same Hot Deal/Priority ribbon from
  /// `agreementExpiryDate`).
  Future<List<PublicListingSummary>> getHotDeals({
    String? city,
    String? listingType,
  }) async {
    try {
      final res = await _dio.get(
        Endpoints.listingsHotDeals,
        queryParameters: {
          if (city?.isNotEmpty ?? false) 'city': city,
          'listingType': ?listingType,
        },
      );
      final data = res.data as List<dynamic>;
      return data
          .map((e) => PublicListingSummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<ListingDetail> getListingDetail(String slug) async {
    try {
      final res = await _dio.get(Endpoints.listingDetail(slug));
      return ListingDetail.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Simulated ₹100 unlock (no payment gateway wired in on the backend yet —
  /// matches what the website itself does today). Idempotent: unlocking an
  /// already-unlocked listing just returns the existing unlock.
  Future<void> unlockListing(String slug) async {
    try {
      final res = await _dio.post(
        Endpoints.listingUnlock(slug),
        data: <String, dynamic>{},
        options: Options(validateStatus: (s) => s != null && s < 500),
      );
      final data = res.data is Map ? res.data as Map : const {};
      if (res.statusCode == 402) {
        // Real payment: open Razorpay, then confirm with the signed payment.
        final order = data['order'] as Map;
        final paid = await openRazorpayCheckout(
          keyId: data['keyId'] as String,
          orderId: order['id'] as String,
          amountPaise: (order['amount'] as num).toInt(),
          description: 'Unlock property details',
        );
        if (paid == null) throw const ApiException('Payment cancelled.', null);
        await _dio.post(Endpoints.listingUnlock(slug), data: {
          'razorpayOrderId': paid.orderId,
          'razorpayPaymentId': paid.paymentId,
          'razorpaySignature': paid.signature,
        });
        return;
      }
      if (res.statusCode != null && res.statusCode! >= 400) {
        throw ApiException(data['error']?.toString() ?? 'unknown_error', res.statusCode);
      }
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } on String catch (message) {
      throw ApiException(message, null);
    }
  }

  /// Rings this listing's channel partner (push + WhatsApp to them).
  /// Requires the listing to already be unlocked — unlockListing() above
  /// also records the save ringAgentListing() needs server-side, so by the
  /// time this is callable from the UI that precondition is already met.
  /// Capped at 50 per listing per rolling 24h; returns how many are left.
  Future<int> ringListing(String slug) async {
    try {
      final res = await _dio.post(Endpoints.listingRing(slug));
      return (res.data as Map)['ringsRemaining'] as int;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
