import 'agent_document.dart';
import 'investor_profile.dart';

/// Matches `AgentProfile` as returned by `GET /api/agent/me`.
class AgentProfile {
  const AgentProfile({
    required this.id,
    this.agentCode,
    this.city,
    this.shopName,
    this.shopAddress,
    this.alternatePhone,
    this.yearsExperience,
    this.staffCount,
    this.reraNumber,
    this.gstNumber,
    required this.status,
    this.rejectionReason,
    required this.primeStatus,
    required this.walletBalance,
    required this.ratingAvg,
    required this.documents,
    required this.investors,
  });

  final String id;
  final String? agentCode;
  final String? city;
  final String? shopName;
  final String? shopAddress;
  final String? alternatePhone;
  final int? yearsExperience;
  final int? staffCount;
  final String? reraNumber;
  final String? gstNumber;
  final String status; // PENDING | APPROVED | REJECTED
  final String? rejectionReason;
  final bool primeStatus;
  final int walletBalance;
  final double ratingAvg;
  final List<AgentDocument> documents;
  final List<InvestorProfile> investors;

  bool get canCreateListings => status == 'APPROVED' && primeStatus;

  factory AgentProfile.fromJson(Map<String, dynamic> json) {
    return AgentProfile(
      id: json['id'] as String,
      agentCode: json['agentCode'] as String?,
      city: json['city'] as String?,
      shopName: json['shopName'] as String?,
      shopAddress: json['shopAddress'] as String?,
      alternatePhone: json['alternatePhone'] as String?,
      yearsExperience: (json['yearsExperience'] as num?)?.toInt(),
      staffCount: (json['staffCount'] as num?)?.toInt(),
      reraNumber: json['reraNumber'] as String?,
      gstNumber: json['gstNumber'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      rejectionReason: json['rejectionReason'] as String?,
      primeStatus: json['primeStatus'] as bool? ?? false,
      walletBalance: (json['walletBalance'] as num?)?.toInt() ?? 0,
      ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 0,
      documents: (json['documents'] as List<dynamic>? ?? [])
          .map((e) => AgentDocument.fromJson(e as Map<String, dynamic>))
          .toList(),
      investors: (json['investors'] as List<dynamic>? ?? [])
          .map((e) => InvestorProfile.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
