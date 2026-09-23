/// Matches the raw `PlatformAntiBypassAgreement` Prisma shape returned by
/// `POST /api/buyer/direct-visit/verify` (nested under `agreement`) and
/// `POST /api/agreements/{id}/sign`.
class AntiBypassAgreement {
  const AntiBypassAgreement({
    required this.id,
    this.directVisitId,
    required this.agentListingId,
    required this.buyerId,
    required this.sellerPhone,
    this.sellerName,
    this.buyerName,
    this.buyerPhone,
    required this.propertyAddress,
    required this.legalTermsSummary,
    required this.serviceFeePercent,
    required this.buyerSigned,
    this.buyerSignedAt,
    required this.sellerSigned,
    this.sellerSignedAt,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String? directVisitId;
  final String agentListingId;
  final String buyerId;
  final String sellerPhone;
  final String? sellerName;
  final String? buyerName;
  final String? buyerPhone;
  final String propertyAddress;
  final String legalTermsSummary;
  final double serviceFeePercent;
  final bool buyerSigned;
  final DateTime? buyerSignedAt;
  final bool sellerSigned;
  final DateTime? sellerSignedAt;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory AntiBypassAgreement.fromJson(Map<String, dynamic> json) => AntiBypassAgreement(
        id: json['id'] as String,
        directVisitId: json['directVisitId'] as String?,
        agentListingId: json['agentListingId'] as String,
        buyerId: json['buyerId'] as String,
        sellerPhone: json['sellerPhone'] as String? ?? '',
        sellerName: json['sellerName'] as String?,
        buyerName: json['buyerName'] as String?,
        buyerPhone: json['buyerPhone'] as String?,
        propertyAddress: json['propertyAddress'] as String? ?? '',
        legalTermsSummary: json['legalTermsSummary'] as String? ?? '',
        serviceFeePercent: (json['serviceFeePercent'] as num?)?.toDouble() ?? 1.0,
        buyerSigned: json['buyerSigned'] as bool? ?? false,
        buyerSignedAt: json['buyerSignedAt'] != null
            ? DateTime.parse(json['buyerSignedAt'] as String)
            : null,
        sellerSigned: json['sellerSigned'] as bool? ?? false,
        sellerSignedAt: json['sellerSignedAt'] != null
            ? DateTime.parse(json['sellerSignedAt'] as String)
            : null,
        status: json['status'] as String? ?? 'ACTIVE',
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}
