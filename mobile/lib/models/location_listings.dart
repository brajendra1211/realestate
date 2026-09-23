/// Response shape of `GET /api/geo/location-listings` — active projects and
/// properties grouped for a city/locality SEO landing page.
class LocationListings {
  const LocationListings({
    required this.city,
    required this.projects,
    required this.properties,
  });

  final String? city;
  final List<LocationProjectSummary> projects;
  final List<LocationPropertySummary> properties;

  factory LocationListings.fromJson(Map<String, dynamic> json) {
    final projects = json['projects'] as List<dynamic>? ?? [];
    final properties = json['properties'] as List<dynamic>? ?? [];
    return LocationListings(
      city: json['city'] as String?,
      projects: projects
          .map((e) => LocationProjectSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      properties: properties
          .map((e) => LocationPropertySummary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class LocationProjectSummary {
  const LocationProjectSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.status,
  });

  final String id;
  final String name;
  final String slug;
  final String status;

  factory LocationProjectSummary.fromJson(Map<String, dynamic> json) =>
      LocationProjectSummary(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
        status: json['status'] as String? ?? '',
      );
}

class LocationPropertySummary {
  const LocationPropertySummary({
    required this.id,
    required this.title,
    required this.slug,
    required this.listingType,
    required this.propertyType,
    required this.price,
    this.projectId,
  });

  final String id;
  final String title;
  final String slug;
  final String listingType;
  final String propertyType;
  final int price;
  final String? projectId;

  factory LocationPropertySummary.fromJson(Map<String, dynamic> json) =>
      LocationPropertySummary(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
        listingType: json['listingType'] as String? ?? '',
        propertyType: json['propertyType'] as String? ?? '',
        price: (json['price'] as num?)?.toInt() ?? 0,
        projectId: json['projectId'] as String?,
      );
}
