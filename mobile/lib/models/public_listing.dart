/// Matches the raw `AgentListing` (+ images, masterProperty, agent) shape
/// returned by `GET /api/listings` — the public agent-listing marketplace
/// browse endpoint. This is a summary card model; the fuller
/// (approval-gated, redacted-unless-unlocked) shape lives in
/// `ListingDetail` for `GET /api/listings/{slug}`.
class PublicListingImage {
  const PublicListingImage({required this.id, required this.url, required this.order});

  final String id;
  final String url;
  final int order;

  factory PublicListingImage.fromJson(Map<String, dynamic> json) {
    return PublicListingImage(
      id: json['id'] as String,
      url: json['url'] as String,
      order: (json['order'] as num?)?.toInt() ?? 0,
    );
  }
}

class PublicListingSummary {
  const PublicListingSummary({
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
    required this.createdAt,
    this.agreementExpiryDate,
    this.agentVerified = false,
  });

  final String id;
  final String slug;
  final String title;
  final String description;
  final String listingType; // SALE | RENT
  final String propertyType; // APARTMENT | VILLA | INDEPENDENT_HOUSE | PLOT | COMMERCIAL | OFFICE
  final int? bedrooms;
  final int? bathrooms;
  final int? areaSqft;
  final int price;
  final String? amenities;
  final List<PublicListingImage> images;
  final String city;
  final String? locality;
  final DateTime createdAt;
  // The 6-month listing-agreement expiry — drives the real-time "Hot Deal"
  // (<=30 days left) / "Priority" (<=90 days left) badges, ported from the
  // backend's getAgreementUrgency() (src/lib/listingDelist.ts).
  final DateTime? agreementExpiryDate;
  // Computed client-side from the nested `agent.verifiedAt` — there is no
  // flat `agentVerified` field on the real API response.
  final bool agentVerified;

  String get coverImageUrl => images.isNotEmpty
      ? (images..sort((a, b) => a.order.compareTo(b.order))).first.url
      : '';

  String get locationLabel => locality != null ? '$locality, $city' : city;

  factory PublicListingSummary.fromJson(Map<String, dynamic> json) {
    final masterProperty = json['masterProperty'] as Map<String, dynamic>?;
    final agent = json['agent'] as Map<String, dynamic>?;
    return PublicListingSummary(
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
      city: (masterProperty?['city'] as String?) ?? '',
      locality: masterProperty?['locality'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      agreementExpiryDate: json['agreementExpiryDate'] != null
          ? DateTime.parse(json['agreementExpiryDate'] as String)
          : null,
      agentVerified: agent?['verifiedAt'] != null,
    );
  }
}
