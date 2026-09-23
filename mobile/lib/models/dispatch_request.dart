/// Matches a `DispatchRequest` as returned by `GET /api/agent/dispatch`
/// (active leads this agent was notified about). Full buyer contact detail
/// is only available via a server-rendered web page, not a REST route, so
/// this app only supports viewing the lead location/amount and accepting it.
class DispatchRequest {
  const DispatchRequest({
    required this.id,
    required this.latitude,
    required this.longitude,
    required this.amount,
    required this.status,
    required this.currentRadiusKm,
    required this.createdAt,
  });

  final String id;
  final double latitude;
  final double longitude;
  final int amount;
  final String status; // SEARCHING | MATCHED | EXPIRED | CANCELLED
  final int currentRadiusKm;
  final DateTime createdAt;

  factory DispatchRequest.fromJson(Map<String, dynamic> json) {
    return DispatchRequest(
      id: json['id'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      amount: (json['amount'] as num).toInt(),
      status: json['status'] as String,
      currentRadiusKm: (json['currentRadiusKm'] as num?)?.toInt() ?? 1,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
