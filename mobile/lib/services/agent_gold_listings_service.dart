import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/gold_listing.dart';

class AgentGoldListingsService {
  AgentGoldListingsService(this._dio);

  final Dio _dio;

  Future<List<GoldListing>> getGoldListings() async {
    try {
      final res = await _dio.get(Endpoints.agentGoldListings);
      final data = res.data as List<dynamic>;
      return data.map((e) => GoldListing.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
