import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';

class RatingService {
  RatingService(this._dio);

  final Dio _dio;

  Future<void> submitRating({
    required String agentCode,
    required String customerPhone,
    required int stars,
    String? review,
  }) async {
    try {
      await _dio.post(
        Endpoints.rateAgent(agentCode),
        data: {
          'customerPhone': customerPhone,
          'stars': stars,
          if (review != null && review.isNotEmpty) 'review': review,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
