/// Matches an `InvestorProfile` as returned by `GET /api/agent/investors`
/// (an agent's own list of investors they referred).
class InvestorProfile {
  const InvestorProfile({
    required this.id,
    this.investorCode,
    required this.totalInvested,
    required this.feeStatus,
    required this.profitDistributionCount,
  });

  final String id;
  final String? investorCode;
  final int totalInvested;
  final String feeStatus; // PENDING | PAID
  final int profitDistributionCount;

  factory InvestorProfile.fromJson(Map<String, dynamic> json) {
    final count = json['_count'] as Map<String, dynamic>?;
    return InvestorProfile(
      id: json['id'] as String,
      investorCode: json['investorCode'] as String?,
      totalInvested: (json['totalInvested'] as num?)?.toInt() ?? 0,
      feeStatus: json['feeStatus'] as String? ?? 'PENDING',
      profitDistributionCount: (count?['profitDistributions'] as num?)?.toInt() ?? 0,
    );
  }
}
