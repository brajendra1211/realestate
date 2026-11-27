import 'package:dio/dio.dart';

import '../core/network/endpoints.dart';

class LocationService {
  LocationService(this._dio);

  final Dio _dio;

  /// Best-effort — a failed ping shouldn't surface anywhere in the agent UI,
  /// it just means the admin live map falls back to the agent's shop pin.
  Future<void> pingLocation(double latitude, double longitude) async {
    try {
      await _dio.post(Endpoints.agentLocation, data: {'latitude': latitude, 'longitude': longitude});
    } catch (_) {
      // Swallowed by design — see above.
    }
  }
}
