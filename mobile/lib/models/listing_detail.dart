import 'public_listing.dart';

/// The teaser/unlock-gated shape returned by `GET /api/listings/{slug}`.
/// [unlocked] flips to true once the logged-in buyer has paid to unlock
/// this listing (`POST /api/listings/{slug}/unlock`) — the post-unlock
/// fields (exactAddress/agent*/shop*) are only present then.
class ListingDetail {
  const ListingDetail({
    required this.id,
    required this.slug,
    required this.title,
    required this.description,
    required this.listingType,
    required this.propertyType,
    this.bedrooms,
    this.bathrooms,
    this.areaSqft,
    required this.price,
    this.amenities,
    required this.images,
    required this.city,
    this.locality,
    required this.unlocked,
    this.exactAddress,
    this.agentCode,
    this.agentName,
    this.agentPhone,
    this.shopName,
    this.shopLatitude,
    this.shopLongitude,
  });

  final String id;
  final String slug;
  final String title;
  final String description;
  final String listingType;
  final String propertyType;
  final int? bedrooms;
  final int? bathrooms;
  final int? areaSqft;
  final int price;
  final String? amenities;
  final List<PublicListingImage> images;
  final String city;
  final String? locality;
  final bool unlocked;
  final String? exactAddress;
  final String? agentCode;
  final String? agentName;
  final String? agentPhone;
  final String? shopName;
  final double? shopLatitude;
  final double? shopLongitude;

  List<String> get amenityList => (amenities ?? '')
      .split(',')
      .map((a) => a.trim())
      .where((a) => a.isNotEmpty)
      .toList();

  factory ListingDetail.fromJson(Map<String, dynamic> json) {
    return ListingDetail(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      listingType: json['listingType'] as String,
      propertyType: json['propertyType'] as String,
      bedrooms: (json['bedrooms'] as num?)?.toInt(),
      bathrooms: (json['bathrooms'] as num?)?.toInt(),
      areaSqft: (json['areaSqft'] as num?)?.toInt(),
      price: (json['price'] as num).toInt(),
      amenities: json['amenities'] as String?,
      images: (json['images'] as List<dynamic>? ?? [])
          .map((e) => PublicListingImage.fromJson(e as Map<String, dynamic>))
          .toList(),
      city: json['city'] as String? ?? '',
      locality: json['locality'] as String?,
      unlocked: json['unlocked'] as bool? ?? false,
      exactAddress: json['exactAddress'] as String?,
      agentCode: json['agentCode'] as String?,
      agentName: json['agentName'] as String?,
      agentPhone: json['agentPhone'] as String?,
      shopName: json['shopName'] as String?,
      shopLatitude: (json['shopLatitude'] as num?)?.toDouble(),
      shopLongitude: (json['shopLongitude'] as num?)?.toDouble(),
    );
  }
}
