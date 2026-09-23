import 'property.dart';

/// Matches `GET /api/buyer/me`'s response — a single mobile-friendly bundle
/// of everything the website's `/buyer/dashboard` page fetches separately.
class BuyerUser {
  const BuyerUser({required this.id, required this.name, this.email, this.phone});

  final String id;
  final String name;
  final String? email;
  final String? phone;

  factory BuyerUser.fromJson(Map<String, dynamic> json) => BuyerUser(
        id: json['id'] as String,
        name: json['name'] as String? ?? 'Buyer',
        email: json['email'] as String?,
        phone: json['phone'] as String?,
      );
}

class CurrentAgent {
  const CurrentAgent({
    required this.id,
    this.agentCode,
    this.shopName,
    required this.latitude,
    required this.longitude,
  });

  final String id;
  final String? agentCode;
  final String? shopName;
  final double latitude;
  final double longitude;

  factory CurrentAgent.fromJson(Map<String, dynamic> json) => CurrentAgent(
        id: json['id'] as String,
        agentCode: json['agentCode'] as String?,
        shopName: json['shopName'] as String?,
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
      );
}

class SwitchGate {
  const SwitchGate({required this.allowed, this.reason, this.nextAllowedAt});

  final bool allowed;
  final String? reason; // dailyLimitReached | cooldown
  final DateTime? nextAllowedAt;

  factory SwitchGate.fromJson(Map<String, dynamic> json) => SwitchGate(
        allowed: json['allowed'] as bool? ?? false,
        reason: json['reason'] as String?,
        nextAllowedAt: json['nextAllowedAt'] != null
            ? DateTime.parse(json['nextAllowedAt'] as String)
            : null,
      );
}

class Enquiry {
  const Enquiry({
    required this.id,
    this.message,
    required this.createdAt,
    this.propertyTitle,
    this.propertySlug,
  });

  final String id;
  final String? message;
  final DateTime createdAt;
  final String? propertyTitle;
  final String? propertySlug;

  factory Enquiry.fromJson(Map<String, dynamic> json) {
    final property = json['property'] as Map<String, dynamic>?;
    return Enquiry(
      id: json['id'] as String,
      message: json['message'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      propertyTitle: property?['title'] as String?,
      propertySlug: property?['slug'] as String?,
    );
  }
}

class BuyerMe {
  const BuyerMe({
    required this.user,
    required this.savedProperties,
    required this.enquiries,
    this.currentAgent,
    this.switchGate,
  });

  final BuyerUser user;
  final List<Property> savedProperties;
  final List<Enquiry> enquiries;
  final CurrentAgent? currentAgent;
  final SwitchGate? switchGate;

  factory BuyerMe.fromJson(Map<String, dynamic> json) => BuyerMe(
        user: BuyerUser.fromJson(json['user'] as Map<String, dynamic>),
        savedProperties: (json['savedProperties'] as List<dynamic>? ?? [])
            .map((e) => Property.fromJson(e as Map<String, dynamic>))
            .toList(),
        enquiries: (json['enquiries'] as List<dynamic>? ?? [])
            .map((e) => Enquiry.fromJson(e as Map<String, dynamic>))
            .toList(),
        currentAgent: json['currentAgent'] != null
            ? CurrentAgent.fromJson(json['currentAgent'] as Map<String, dynamic>)
            : null,
        switchGate: json['switchGate'] != null
            ? SwitchGate.fromJson(json['switchGate'] as Map<String, dynamic>)
            : null,
      );
}
