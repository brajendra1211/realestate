/// Matches a `Property` (owner/dealer self-listed inventory) as returned
/// nested in `GET /api/buyer/me`'s `savedProperties`. Distinct from
/// `PublicListingSummary` (agent-managed `AgentListing`s) — a different
/// inventory the rest of the app browses; this model exists only to show
/// what a buyer has already saved, not to power a new browse flow.
class Property {
  const Property({
    required this.id,
    required this.slug,
    required this.title,
    required this.listingType,
    required this.propertyType,
    required this.price,
    this.bedrooms,
    this.bathrooms,
    this.areaSqft,
    required this.city,
    this.locality,
    required this.images,
  });

  final String id;
  final String slug;
  final String title;
  final String listingType; // SALE | RENT
  final String propertyType;
  final int price;
  final int? bedrooms;
  final int? bathrooms;
  final int? areaSqft;
  final String city;
  final String? locality;
  final List<String> images;

  String get coverImageUrl => images.isNotEmpty ? images.first : '';
  String get locationLabel => locality != null ? '$locality, $city' : city;

  factory Property.fromJson(Map<String, dynamic> json) {
    final images = (json['images'] as List<dynamic>? ?? [])
        .map((e) => (e as Map<String, dynamic>)['url'] as String)
        .toList();
    return Property(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      listingType: json['listingType'] as String,
      propertyType: json['propertyType'] as String,
      price: (json['price'] as num).toInt(),
      bedrooms: (json['bedrooms'] as num?)?.toInt(),
      bathrooms: (json['bathrooms'] as num?)?.toInt(),
      areaSqft: (json['areaSqft'] as num?)?.toInt(),
      city: json['city'] as String,
      locality: json['locality'] as String?,
      images: images,
    );
  }
}
