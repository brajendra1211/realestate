import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_owned_listing.dart';

class DedupCandidate {
  const DedupCandidate({
    required this.masterId,
    required this.city,
    this.locality,
    required this.distanceKm,
  });

  final String masterId;
  final String city;
  final String? locality;
  final double distanceKm;

  factory DedupCandidate.fromJson(Map<String, dynamic> json) {
    return DedupCandidate(
      masterId: json['masterId'] as String,
      city: json['city'] as String? ?? '',
      locality: json['locality'] as String?,
      distanceKm: (json['distanceKm'] as num).toDouble(),
    );
  }
}

class DedupSearchResult {
  const DedupSearchResult({
    required this.latitude,
    required this.longitude,
    required this.candidates,
  });

  final double latitude;
  final double longitude;
  final List<DedupCandidate> candidates;

  factory DedupSearchResult.fromJson(Map<String, dynamic> json) {
    return DedupSearchResult(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      candidates: (json['candidates'] as List<dynamic>? ?? [])
          .map((e) => DedupCandidate.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class AgentListingsService {
  AgentListingsService(this._dio);

  final Dio _dio;

  Future<List<AgentOwnedListing>> getListings() async {
    try {
      final res = await _dio.get(Endpoints.agentListings);
      final data = res.data as List<dynamic>;
      return data
          .map((e) => AgentOwnedListing.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<DedupSearchResult> dedupSearch({
    required String city,
    String? locality,
    required String address,
  }) async {
    try {
      final res = await _dio.post(
        Endpoints.agentListingsDedupSearch,
        data: {'city': city, 'locality': ?locality, 'address': address},
      );
      return DedupSearchResult.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<String> uploadImage(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });
      final res = await _dio.post(Endpoints.agentListingsUploadImage, data: formData);
      return (res.data as Map<String, dynamic>)['url'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> renew(String id, {required String planTier}) async {
    try {
      await _dio.post(Endpoints.agentListingRenew(id), data: {'planTier': planTier});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> createListing({
    String? masterPropertyId,
    required String city,
    String? locality,
    required double latitude,
    required double longitude,
    required String title,
    required String description,
    required String listingType,
    required String propertyType,
    int? bedrooms,
    int? bathrooms,
    int? areaSqft,
    required int price,
    required String exactAddress,
    String? amenities,
    required List<String> images,
  }) async {
    try {
      await _dio.post(
        Endpoints.agentListings,
        data: {
          'masterPropertyId': ?masterPropertyId,
          'city': city,
          'locality': ?locality,
          'latitude': latitude,
          'longitude': longitude,
          'title': title,
          'description': description,
          'listingType': listingType,
          'propertyType': propertyType,
          'bedrooms': ?bedrooms,
          'bathrooms': ?bathrooms,
          'areaSqft': ?areaSqft,
          'price': price,
          'exactAddress': exactAddress,
          'amenities': ?amenities,
          'images': images,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
