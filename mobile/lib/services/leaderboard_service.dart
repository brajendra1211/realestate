import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/leaderboard_entry.dart';

class LeaderboardService {
  LeaderboardService(this._dio);

  final Dio _dio;

  Future<LeaderboardData> getLeaderboard() async {
    try {
      final res = await _dio.get(Endpoints.leaderboard);
      return LeaderboardData.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
