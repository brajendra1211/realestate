import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/investor_document.dart';
import '../models/investor_ledger.dart';
import '../models/investor_me.dart';

class InvestorService {
  InvestorService(this._dio);

  final Dio _dio;

  Future<InvestorMe> getMe() async {
    try {
      final res = await _dio.get(Endpoints.investorMe);
      return InvestorMe.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<InvestorLedger> getLedger() async {
    try {
      final res = await _dio.get(Endpoints.investorLedger);
      return InvestorLedger.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<InvestorDocuments> getDocuments() async {
    try {
      final res = await _dio.get(Endpoints.investorDocuments);
      return InvestorDocuments.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
