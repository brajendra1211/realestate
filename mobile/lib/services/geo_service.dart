import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/geo_option.dart';
import '../models/location_listings.dart';
import '../models/nearest_location.dart';

/// Every route here except [getNearest] requires a logged-in session of any
/// role — callers must only use this from screens reached after a buyer,
/// agent, or investor login (see `location_picker_field.dart` for the
/// reusable UI built on top of it).
class GeoService {
  GeoService(this._dio);

  final Dio _dio;

  Future<List<GeoOption>> getCountries() async {
    try {
      final res = await _dio.get(Endpoints.geoCountries);
      return _parseOptions(res.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<GeoOption>> getStates(String countryId) async {
    try {
      final res = await _dio.get(
        Endpoints.geoStates,
        queryParameters: {'countryId': countryId},
      );
      return _parseOptions(res.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<GeoOption>> getCities(String stateId) async {
    try {
      final res = await _dio.get(
        Endpoints.geoCities,
        queryParameters: {'stateId': stateId},
      );
      return _parseOptions(res.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<GeoOption>> getLocalities(String cityId) async {
    try {
      final res = await _dio.get(
        Endpoints.geoLocalities,
        queryParameters: {'cityId': cityId},
      );
      return _parseOptions(res.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<LocationListings> getLocationListings(
    String cityId, {
    String? localityId,
    String? excludeId,
  }) async {
    try {
      final res = await _dio.get(
        Endpoints.geoLocationListings,
        queryParameters: {
          'cityId': cityId,
          'localityId': ?localityId,
          'excludeId': ?excludeId,
        },
      );
      return LocationListings.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Public — no session required.
  Future<NearestLocation> getNearest(double latitude, double longitude) async {
    try {
      final res = await _dio.get(
        Endpoints.geoNearest,
        queryParameters: {'lat': latitude, 'lng': longitude},
      );
      return NearestLocation.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  List<GeoOption> _parseOptions(dynamic data) {
    return (data as List<dynamic>)
        .map((e) => GeoOption.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
