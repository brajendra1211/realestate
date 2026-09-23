import 'public_listing.dart';

/// Matches an agent's own listing as returned by `GET /api/agent/listings`
/// — same shape as the public marketplace listing, plus moderation status,
/// source, and unlock count (not exposed on the public browse endpoint).
class AgentOwnedListing {
  const AgentOwnedListing({
    required this.id,
    required this.slug,
    required this.title,
    required this.listingType,
    required this.propertyType,
    required this.price,
    required this.approvalStatus,
    required this.source,
    required this.images,
    required this.city,
    this.locality,
    required this.unlockCount,
    required this.listingPlan,
    required this.isDelisted,
    this.listingExpiresAt,
  });

  final String id;
  final String slug;
  final String title;
  final String listingType;
  final String propertyType;
  final int price;
  final String approvalStatus; // PENDING | APPROVED | REJECTED
  final String source; // AGENT | CUSTOMER_GOLD
  final List<PublicListingImage> images;
  final String city;
  final String? locality;
  final int unlockCount;
  final String listingPlan; // BASIC | GOLD
  final bool isDelisted;
  final DateTime? listingExpiresAt;

  /// Mirrors the backend's own near-expiry window (it warns at 7d/2d) —
  /// used to decide when to surface the "Renew" action.
  bool get needsRenewal =>
      isDelisted ||
      (listingExpiresAt != null &&
          listingExpiresAt!.difference(DateTime.now()).inDays <= 7);

  String get coverImageUrl => images.isNotEmpty
      ? (images..sort((a, b) => a.order.compareTo(b.order))).first.url
      : '';

  factory AgentOwnedListing.fromJson(Map<String, dynamic> json) {
    final masterProperty = json['masterProperty'] as Map<String, dynamic>?;
    final count = json['_count'] as Map<String, dynamic>?;
    return AgentOwnedListing(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      listingType: json['listingType'] as String,
      propertyType: json['propertyType'] as String,
      price: (json['price'] as num).toInt(),
      approvalStatus: json['approvalStatus'] as String? ?? 'PENDING',
      source: json['source'] as String? ?? 'AGENT',
      images: (json['images'] as List<dynamic>? ?? [])
          .map((e) => PublicListingImage.fromJson(e as Map<String, dynamic>))
          .toList(),
      city: (masterProperty?['city'] as String?) ?? '',
      locality: masterProperty?['locality'] as String?,
      unlockCount: (count?['unlocks'] as num?)?.toInt() ?? 0,
      listingPlan: json['listingPlan'] as String? ?? 'BASIC',
      isDelisted: json['isDelisted'] as bool? ?? false,
      listingExpiresAt: json['listingExpiresAt'] != null
          ? DateTime.parse(json['listingExpiresAt'] as String)
          : null,
    );
  }
}
