import 'public_listing.dart';

/// Matches a nearby Gold self-listing as returned by
/// `GET /api/agent/gold-listings`.
class GoldListing {
  const GoldListing({
    required this.id,
    required this.slug,
    required this.title,
    required this.listingType,
    required this.propertyType,
    required this.price,
    required this.images,
    required this.city,
    this.locality,
    required this.distanceKm,
  });

  final String id;
  final String slug;
  final String title;
  final String listingType;
  final String propertyType;
  final int price;
  final List<PublicListingImage> images;
  final String city;
  final String? locality;
  final double distanceKm;

  String get coverImageUrl => images.isNotEmpty
      ? (images..sort((a, b) => a.order.compareTo(b.order))).first.url
      : '';

  factory GoldListing.fromJson(Map<String, dynamic> json) {
    final masterProperty = json['masterProperty'] as Map<String, dynamic>?;
    return GoldListing(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      listingType: json['listingType'] as String,
      propertyType: json['propertyType'] as String,
      price: (json['price'] as num).toInt(),
      images: (json['images'] as List<dynamic>? ?? [])
          .map((e) => PublicListingImage.fromJson(e as Map<String, dynamic>))
          .toList(),
      city: (masterProperty?['city'] as String?) ?? '',
      locality: masterProperty?['locality'] as String?,
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0,
    );
  }
}
