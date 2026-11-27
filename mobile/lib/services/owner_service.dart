import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';

class OwnerPlan {
  const OwnerPlan({required this.id, required this.name, required this.price, required this.months});
  final String id;
  final String name;
  final int price;
  final int months;
}

class OwnerStartResult {
  const OwnerStartResult({
    required this.requestId,
    required this.statusToken,
    required this.amount,
    required this.orderId,
    required this.orderAmount,
    required this.keyId,
  });
  final String requestId;
  final String statusToken;
  final int amount;
  final String orderId;
  final int orderAmount;
  final String keyId;
}

class OwnerRequest {
  OwnerRequest(Map<String, dynamic> j)
      : id = j['id'] as String,
        status = j['status'] as String,
        statusLabel = j['statusLabel'] as String? ?? '',
        purpose = j['purpose'] as String,
        plan = j['plan'] as String,
        amount = (j['amount'] as num).toInt(),
        city = j['city'] as String? ?? '',
        locality = j['locality'] as String?,
        formToken = j['formToken'] as String,
        statusToken = j['statusToken'] as String,
        buzzRadiusKm = (j['buzzRadiusKm'] as num?)?.toInt() ?? 0,
        buzzCount = (j['buzzCount'] as num?)?.toInt() ?? 0,
        lastBuzzAt = j['lastBuzzAt'] == null ? null : DateTime.tryParse(j['lastBuzzAt'] as String),
        partnerName = j['partnerName'] as String?,
        listingSlug = j['listingSlug'] as String?,
        listingTitle = j['listingTitle'] as String?;

  final String id;
  final String status;
  final String statusLabel;
  final String purpose;
  final String plan;
  final int amount;
  final String city;
  final String? locality;
  final String formToken;
  final String statusToken;
  final int buzzRadiusKm;
  final int buzzCount;
  final DateTime? lastBuzzAt;
  final String? partnerName;
  final String? listingSlug;
  final String? listingTitle;

  String get planName => plan == 'GOLD' ? 'Pro' : 'Basic';
}

/// REST client for the owner "list my property" flow (/api/owner/*).
/// The server returns a readable message in `error`, so [ApiException.code] is
/// shown to the owner as-is.
class OwnerService {
  OwnerService(this._dio);
  final Dio _dio;

  Future<List<OwnerPlan>> plans() async {
    try {
      final res = await _dio.get('/api/owner/plans');
      return ((res.data as Map)['plans'] as List)
          .map((p) => OwnerPlan(
                id: p['id'] as String,
                name: p['name'] as String,
                price: (p['price'] as num).toInt(),
                months: (p['months'] as num).toInt(),
              ))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> sendOtp(String phone) async {
    try {
      await _dio.post('/api/owner/otp', data: {'phone': phone});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<OwnerStartResult> start(Map<String, dynamic> form) async {
    try {
      final res = await _dio.post('/api/owner/start', data: form);
      final d = res.data as Map;
      final order = d['order'] as Map;
      return OwnerStartResult(
        requestId: d['requestId'] as String,
        statusToken: d['statusToken'] as String,
        amount: (d['amount'] as num).toInt(),
        orderId: order['id'] as String,
        orderAmount: (order['amount'] as num).toInt(),
        keyId: d['keyId'] as String,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Returns the `formToken` when the owner should now fill the property details, or null for a sell request.
  Future<String?> verifyPayment({
    required String requestId,
    required String statusToken,
    required String orderId,
    required String paymentId,
    required String signature,
  }) async {
    try {
      final res = await _dio.post('/api/owner/verify-payment', data: {
        'requestId': requestId,
        'statusToken': statusToken,
        'orderId': orderId,
        'paymentId': paymentId,
        'signature': signature,
      });
      final d = res.data as Map;
      return d['next'] == 'details' ? d['formToken'] as String? : null;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Owner buzzes the partners in range again. Returns how many were reached.
  Future<int> rebuzz(String requestId) async {
    try {
      final res = await _dio.post('/api/owner/rebuzz', data: {'requestId': requestId});
      return ((res.data as Map)['reached'] as num?)?.toInt() ?? 0;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<String> uploadPhoto(String token, String filePath) async {
    try {
      final res = await _dio.post(
        '/api/list-request/upload-image',
        data: FormData.fromMap({'token': token, 'file': await MultipartFile.fromFile(filePath)}),
      );
      return (res.data as Map)['url'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> submitDetails(String token, Map<String, dynamic> form) async {
    try {
      await _dio.post('/api/owner/details', data: {'token': token, 'form': form});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<OwnerRequest>> myRequests() async {
    try {
      final res = await _dio.get('/api/owner/requests');
      return ((res.data as Map)['requests'] as List).map((r) => OwnerRequest(r as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

/// Owner-facing message for an API failure (server messages are already readable).
String ownerErrorMessage(Object e) {
  if (e is ApiException) {
    if (e.code == 'network_error') return 'Could not reach the server. Check your connection and try again.';
    if (e.code == 'unknown_error') return 'Something went wrong. Please try again.';
    return e.code;
  }
  if (e is String) return e;
  return 'Something went wrong. Please try again.';
}
