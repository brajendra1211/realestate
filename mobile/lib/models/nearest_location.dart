/// Response shape of the public `GET /api/geo/nearest` endpoint.
class NearestLocation {
  const NearestLocation({
    required this.citySlug,
    required this.cityName,
    this.localitySlug,
    this.localityName,
  });

  final String citySlug;
  final String cityName;
  final String? localitySlug;
  final String? localityName;

  factory NearestLocation.fromJson(Map<String, dynamic> json) => NearestLocation(
        citySlug: json['citySlug'] as String,
        cityName: json['cityName'] as String,
        localitySlug: json['localitySlug'] as String?,
        localityName: json['localityName'] as String?,
      );
}
