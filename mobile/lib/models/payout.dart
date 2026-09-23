/// Matches a `PayoutRequest` as returned by `GET /api/agent/payouts`.
class Payout {
  const Payout({
    required this.id,
    required this.grossAmount,
    required this.tdsAmount,
    required this.netAmount,
    required this.status,
    required this.requestedAt,
  });

  final String id;
  final int grossAmount;
  final int tdsAmount;
  final int netAmount;
  final String status; // PENDING | PAID | REJECTED
  final DateTime requestedAt;

  factory Payout.fromJson(Map<String, dynamic> json) {
    return Payout(
      id: json['id'] as String,
      grossAmount: (json['grossAmount'] as num).toInt(),
      tdsAmount: (json['tdsAmount'] as num).toInt(),
      netAmount: (json['netAmount'] as num).toInt(),
      status: json['status'] as String? ?? 'PENDING',
      requestedAt: DateTime.parse(json['requestedAt'] as String),
    );
  }
}
