import 'anti_bypass_agreement.dart';

/// Response of `POST /api/buyer/direct-visit/request`.
class DirectVisitRequestResult {
  const DirectVisitRequestResult({
    required this.visitId,
    required this.status,
    required this.message,
  });

  final String visitId;
  final String status;
  final String message;

  factory DirectVisitRequestResult.fromJson(Map<String, dynamic> json) =>
      DirectVisitRequestResult(
        visitId: json['visitId'] as String,
        status: json['status'] as String? ?? 'OTP_SENT',
        message: json['message'] as String? ?? '',
      );
}

/// Response of `POST /api/buyer/direct-visit/verify`.
class DirectVisitVerification {
  const DirectVisitVerification({
    required this.visitId,
    required this.agreementId,
    required this.verifiedAt,
    required this.agreement,
  });

  final String visitId;
  final String agreementId;
  final DateTime verifiedAt;
  final AntiBypassAgreement agreement;

  factory DirectVisitVerification.fromJson(Map<String, dynamic> json) =>
      DirectVisitVerification(
        visitId: json['visitId'] as String,
        agreementId: json['agreementId'] as String,
        verifiedAt: DateTime.parse(json['verifiedAt'] as String),
        agreement: AntiBypassAgreement.fromJson(json['agreement'] as Map<String, dynamic>),
      );
}
