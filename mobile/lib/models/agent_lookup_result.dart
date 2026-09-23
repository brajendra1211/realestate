/// Response of `GET /api/agent/lookup?code=` — used to validate a referral
/// agent code inline before it's submitted with a form. Requires any
/// logged-in session (buyer/agent/investor), so only call this from
/// post-login screens.
class AgentLookupResult {
  const AgentLookupResult({
    required this.id,
    this.agentCode,
    required this.name,
    this.shopName,
    this.city,
    required this.phone,
    required this.whatsapp,
    this.email,
    required this.verified,
    required this.primeStatus,
    required this.ratingAvg,
  });

  final String id;
  final String? agentCode;
  final String name;
  final String? shopName;
  final String? city;
  final String phone;
  final String whatsapp;
  final String? email;
  final bool verified;
  final bool primeStatus;
  final double ratingAvg;

  factory AgentLookupResult.fromJson(Map<String, dynamic> json) => AgentLookupResult(
        id: json['id'] as String,
        agentCode: json['agentCode'] as String?,
        name: json['name'] as String? ?? '',
        shopName: json['shopName'] as String?,
        city: json['city'] as String?,
        phone: json['phone'] as String? ?? '',
        whatsapp: json['whatsapp'] as String? ?? '',
        email: json['email'] as String?,
        verified: json['verified'] as bool? ?? false,
        primeStatus: json['primeStatus'] as bool? ?? false,
        ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 0,
      );
}
