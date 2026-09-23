/// Matches `GET /api/investor/me`'s response — the *logged-in investor's
/// own* profile (via investor OTP login). Distinct from `InvestorProfile`
/// (`models/investor_profile.dart`), which is an *agent's* list of
/// investors they referred (`GET /api/agent/investors`) — a different API
/// shape for the same underlying Prisma model.
class InvestorReferringAgent {
  const InvestorReferringAgent({this.agentCode, this.shopName});

  final String? agentCode;
  final String? shopName;

  factory InvestorReferringAgent.fromJson(Map<String, dynamic> json) =>
      InvestorReferringAgent(
        agentCode: json['agentCode'] as String?,
        shopName: json['shopName'] as String?,
      );
}

class InvestorMe {
  const InvestorMe({
    required this.id,
    this.investorCode,
    required this.feeStatus,
    required this.totalInvested,
    this.expiresAt,
    required this.referringAgent,
  });

  final String id;
  final String? investorCode;
  final String feeStatus; // PENDING | PAID
  final int totalInvested;
  final DateTime? expiresAt;
  final InvestorReferringAgent referringAgent;

  factory InvestorMe.fromJson(Map<String, dynamic> json) => InvestorMe(
        id: json['id'] as String,
        investorCode: json['investorCode'] as String?,
        feeStatus: json['feeStatus'] as String? ?? 'PENDING',
        totalInvested: (json['totalInvested'] as num?)?.toInt() ?? 0,
        expiresAt: json['expiresAt'] != null
            ? DateTime.parse(json['expiresAt'] as String)
            : null,
        referringAgent: InvestorReferringAgent.fromJson(
          json['referringAgent'] as Map<String, dynamic>? ?? const {},
        ),
      );
}
