/// Matches a `VisitAppointment` as returned by `GET /api/buyer/appointments`
/// — the buyer-side shape (agent + isDue), distinct from the agent-side
/// `Appointment` model (buyer + no isDue) used by
/// `agent_appointments_screen.dart`.
class BuyerAppointment {
  const BuyerAppointment({
    required this.id,
    required this.bookingCode,
    this.agentCode,
    this.shopName,
    this.masterId,
    required this.scheduledAt,
    required this.status,
    required this.isDue,
  });

  final String id;
  final String bookingCode;
  final String? agentCode;
  final String? shopName;
  final String? masterId;
  final DateTime scheduledAt;
  final String status; // SCHEDULED | COMPLETED | NO_SHOW | CANCELLED
  final bool isDue;

  factory BuyerAppointment.fromJson(Map<String, dynamic> json) {
    final agent = json['agent'] as Map<String, dynamic>?;
    final masterProperty = json['masterProperty'] as Map<String, dynamic>?;
    return BuyerAppointment(
      id: json['id'] as String,
      bookingCode: json['bookingCode'] as String? ?? '',
      agentCode: agent?['agentCode'] as String?,
      shopName: agent?['shopName'] as String?,
      masterId: masterProperty?['masterId'] as String?,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      status: json['status'] as String? ?? 'SCHEDULED',
      isDue: json['isDue'] as bool? ?? false,
    );
  }
}
