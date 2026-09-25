import 'public_listing.dart';

class AgentShopDetail {
  const AgentShopDetail({
    required this.agentCode,
    required this.name,
    this.shopName,
    this.shopAddress,
    this.city,
    required this.phone,
    this.alternatePhone,
    this.whatsappNumber,
    this.logoUrl,
    required this.primeStatus,
    this.yearsExperience,
    this.staffCount,
    this.reraNumber,
    this.ratingAvg,
    required this.ratingCount,
  });

  final String agentCode;
  final String name;
  final String? shopName;
  final String? shopAddress;
  final String? city;
  final String phone;
  final String? alternatePhone;
  final String? whatsappNumber;
  final String? logoUrl;
  final bool primeStatus;
  final int? yearsExperience;
  final int? staffCount;
  final String? reraNumber;
  final double? ratingAvg;
  final int ratingCount;

  factory AgentShopDetail.fromJson(Map<String, dynamic> json) {
    return AgentShopDetail(
      agentCode: json['agentCode'] as String? ?? '',
      name: json['name'] as String? ?? 'Channel Partner',
      shopName: json['shopName'] as String?,
      shopAddress: json['shopAddress'] as String?,
      city: json['city'] as String?,
      phone: json['phone'] as String? ?? '',
      alternatePhone: json['alternatePhone'] as String?,
      whatsappNumber: json['whatsappNumber'] as String?,
      logoUrl: json['logoUrl'] as String?,
      primeStatus: json['primeStatus'] as bool? ?? false,
      yearsExperience: json['yearsExperience'] as int?,
      staffCount: json['staffCount'] as int?,
      reraNumber: json['reraNumber'] as String?,
      ratingAvg: (json['ratingAvg'] as num?)?.toDouble(),
      ratingCount: json['ratingCount'] as int? ?? 0,
    );
  }
}

class AgentShopResponse {
  const AgentShopResponse({
    required this.isUnlocked,
    required this.unlockAmount,
    this.razorpayKeyId,
    required this.agent,
    required this.listings,
  });

  final bool isUnlocked;
  final int unlockAmount;
  final String? razorpayKeyId;
  final AgentShopDetail agent;
  final List<PublicListingSummary> listings;

  factory AgentShopResponse.fromJson(Map<String, dynamic> json) {
    return AgentShopResponse(
      isUnlocked: json['isUnlocked'] as bool? ?? false,
      unlockAmount: json['unlockAmount'] as int? ?? 50,
      razorpayKeyId: json['razorpayKeyId'] as String?,
      agent: AgentShopDetail.fromJson(json['agent'] as Map<String, dynamic>? ?? {}),
      listings: (json['listings'] as List<dynamic>? ?? [])
          .map((e) => PublicListingSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
