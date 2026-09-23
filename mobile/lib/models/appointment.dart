/// Matches a `VisitAppointment` as returned by `GET /api/agent/appointments`.
class Appointment {
  const Appointment({
    required this.id,
    required this.bookingCode,
    this.buyerName,
    this.buyerPhone,
    this.masterId,
    required this.scheduledAt,
    required this.status,
  });

  final String id;
  final String bookingCode;
  final String? buyerName;
  final String? buyerPhone;
  final String? masterId;
  final DateTime scheduledAt;
  final String status; // SCHEDULED | COMPLETED | NO_SHOW | CANCELLED

  factory Appointment.fromJson(Map<String, dynamic> json) {
    final buyer = json['buyer'] as Map<String, dynamic>?;
    final masterProperty = json['masterProperty'] as Map<String, dynamic>?;
    return Appointment(
      id: json['id'] as String,
      bookingCode: json['bookingCode'] as String? ?? '',
      buyerName: buyer?['name'] as String?,
      buyerPhone: buyer?['phone'] as String?,
      masterId: masterProperty?['masterId'] as String?,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      status: json['status'] as String? ?? 'SCHEDULED',
    );
  }
}
