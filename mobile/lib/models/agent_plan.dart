/// One row of `GET /api/agent/subscription/plans` (public — no session
/// required).
class AgentPlanDefinition {
  const AgentPlanDefinition({
    required this.id,
    required this.name,
    required this.tier,
    required this.price,
    required this.durationDays,
    required this.splitPercent,
    required this.referralAmount,
    required this.companyAmount,
    required this.listingLimit,
  });

  final String id;
  final String name;
  final String tier; // BASIC | PRIME
  final int price;
  final int durationDays;
  final int splitPercent;
  final int referralAmount;
  final int companyAmount;
  final int listingLimit;

  factory AgentPlanDefinition.fromJson(Map<String, dynamic> json) => AgentPlanDefinition(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        tier: json['tier'] as String? ?? 'BASIC',
        price: (json['price'] as num?)?.toInt() ?? 0,
        durationDays: (json['durationDays'] as num?)?.toInt() ?? 30,
        splitPercent: (json['splitPercent'] as num?)?.toInt() ?? 50,
        referralAmount: (json['referralAmount'] as num?)?.toInt() ?? 0,
        companyAmount: (json['companyAmount'] as num?)?.toInt() ?? 0,
        listingLimit: (json['listingLimit'] as num?)?.toInt() ?? 0,
      );
}
