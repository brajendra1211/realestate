import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/anti_bypass_agreement.dart';
import '../models/direct_visit.dart';

class BuyerDirectVisitService {
  BuyerDirectVisitService(this._dio);

  final Dio _dio;

  Future<DirectVisitRequestResult> requestOtp(
    String agentListingId, {
    String? notes,
    double? latitude,
    double? longitude,
    double? locationAccuracy,
  }) async {
    try {
      final res = await _dio.post(
        Endpoints.buyerDirectVisitRequest,
        data: {
          'agentListingId': agentListingId,
          'notes': ?notes,
          'latitude': ?latitude,
          'longitude': ?longitude,
          'locationAccuracy': ?locationAccuracy,
        },
      );
      return DirectVisitRequestResult.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<DirectVisitVerification> verifyOtp(String visitId, String otp) async {
    try {
      final res = await _dio.post(
        Endpoints.buyerDirectVisitVerify,
        data: {'visitId': visitId, 'otp': otp},
      );
      return DirectVisitVerification.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AntiBypassAgreement> signAgreement(String agreementId) async {
    try {
      final res = await _dio.post(Endpoints.agreementSign(agreementId));
      return AntiBypassAgreement.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
