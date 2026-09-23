/// Matches `PropertyVisitLog` as returned by `GET /api/agent/visits`.
class VisitLog {
  const VisitLog({
    required this.id,
    required this.customerPhone,
    this.customerName,
    this.masterId,
    required this.otpVerified,
    required this.isPrimaryOwner,
    required this.visitedAt,
  });

  final String id;
  final String customerPhone;
  final String? customerName;
  final String? masterId;
  final bool otpVerified;
  final bool isPrimaryOwner;
  final DateTime visitedAt;

  factory VisitLog.fromJson(Map<String, dynamic> json) {
    final masterProperty = json['masterProperty'] as Map<String, dynamic>?;
    return VisitLog(
      id: json['id'] as String,
      customerPhone: json['customerPhone'] as String,
      customerName: json['customerName'] as String?,
      masterId: masterProperty?['masterId'] as String?,
      otpVerified: json['otpVerified'] as bool? ?? true,
      isPrimaryOwner: json['isPrimaryOwner'] as bool? ?? true,
      visitedAt: DateTime.parse(json['visitedAt'] as String),
    );
  }
}
