class DealAgentSummary {
  const DealAgentSummary({this.agentCode, this.name, this.phone});

  final String? agentCode;
  final String? name;
  final String? phone;

  factory DealAgentSummary.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return DealAgentSummary(
      agentCode: json['agentCode'] as String?,
      name: user?['name'] as String?,
      phone: user?['phone'] as String?,
    );
  }
}

class DealBroadcastSummary {
  const DealBroadcastSummary({this.flatSize, this.txnType, this.society});

  final String? flatSize;
  final String? txnType;
  final String? society;

  factory DealBroadcastSummary.fromJson(Map<String, dynamic> json) => DealBroadcastSummary(
        flatSize: json['flatSize'] as String?,
        txnType: json['txnType'] as String?,
        society: json['society'] as String?,
      );
}

/// Inter-agent B2B deal — matches the raw `Deal` Prisma shape returned by
/// `GET/POST /api/agent/deals` and `PATCH /api/agent/deals/{id}/stage`.
class Deal {
  const Deal({
    required this.id,
    required this.dealValue,
    required this.status,
    this.propertyTitle,
    this.broadcastId,
    this.buyerAgentId,
    this.sellerAgentId,
    required this.totalCommission,
    required this.platformPercent,
    required this.platformCommission,
    this.buyerCommission,
    this.sellerCommission,
    this.tokenAmount,
    this.tokenDate,
    this.agreementDate,
    this.registryDate,
    required this.commissionDistributed,
    required this.paymentMode,
    this.note,
    required this.dealDate,
    required this.createdAt,
    required this.updatedAt,
    this.buyerAgent,
    this.sellerAgent,
    this.broadcast,
  });

  final String id;
  final int dealValue;
  final String status; // ACTIVE|TOKEN_RECEIVED|AGREEMENT_DONE|REGISTRY_COMPLETED|CLOSED|CANCELLED
  final String? propertyTitle;
  final String? broadcastId;
  final String? buyerAgentId;
  final String? sellerAgentId;
  final int totalCommission;
  final int platformPercent;
  final int platformCommission;
  final int? buyerCommission;
  final int? sellerCommission;
  final int? tokenAmount;
  final DateTime? tokenDate;
  final DateTime? agreementDate;
  final DateTime? registryDate;
  final bool commissionDistributed;
  final String paymentMode;
  final String? note;
  final DateTime dealDate;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DealAgentSummary? buyerAgent;
  final DealAgentSummary? sellerAgent;
  final DealBroadcastSummary? broadcast;

  static const stages = [
    'ACTIVE',
    'TOKEN_RECEIVED',
    'AGREEMENT_DONE',
    'REGISTRY_COMPLETED',
    'CLOSED',
  ];

  factory Deal.fromJson(Map<String, dynamic> json) {
    final buyerAgentJson = json['buyerAgent'] as Map<String, dynamic>?;
    final sellerAgentJson = json['sellerAgent'] as Map<String, dynamic>?;
    final broadcastJson = json['broadcast'] as Map<String, dynamic>?;
    DateTime? parseDate(dynamic v) => v == null ? null : DateTime.parse(v as String);
    return Deal(
      id: json['id'] as String,
      dealValue: (json['dealValue'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'ACTIVE',
      propertyTitle: json['propertyTitle'] as String?,
      broadcastId: json['broadcastId'] as String?,
      buyerAgentId: json['buyerAgentId'] as String?,
      sellerAgentId: json['sellerAgentId'] as String?,
      totalCommission: (json['totalCommission'] as num?)?.toInt() ?? 0,
      platformPercent: (json['platformPercent'] as num?)?.toInt() ?? 10,
      platformCommission: (json['platformCommission'] as num?)?.toInt() ?? 0,
      buyerCommission: (json['buyerCommission'] as num?)?.toInt(),
      sellerCommission: (json['sellerCommission'] as num?)?.toInt(),
      tokenAmount: (json['tokenAmount'] as num?)?.toInt(),
      tokenDate: parseDate(json['tokenDate']),
      agreementDate: parseDate(json['agreementDate']),
      registryDate: parseDate(json['registryDate']),
      commissionDistributed: json['commissionDistributed'] as bool? ?? false,
      paymentMode: json['paymentMode'] as String? ?? 'BANK_TRANSFER',
      note: json['note'] as String?,
      dealDate: DateTime.parse(json['dealDate'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      buyerAgent: buyerAgentJson != null ? DealAgentSummary.fromJson(buyerAgentJson) : null,
      sellerAgent: sellerAgentJson != null ? DealAgentSummary.fromJson(sellerAgentJson) : null,
      broadcast: broadcastJson != null ? DealBroadcastSummary.fromJson(broadcastJson) : null,
    );
  }
}
