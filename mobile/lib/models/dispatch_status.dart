/// The agent matched to a dispatch request, once `status` flips to
/// `MATCHED` — matches `GET /api/dispatch/{id}`'s `acceptedAgent` include.
class DispatchAcceptedAgent {
  const DispatchAcceptedAgent({this.agentCode, this.shopName, this.phone});

  final String? agentCode;
  final String? shopName;
  final String? phone;

  factory DispatchAcceptedAgent.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return DispatchAcceptedAgent(
      agentCode: json['agentCode'] as String?,
      shopName: json['shopName'] as String?,
      phone: user?['phone'] as String?,
    );
  }
}

/// Response of `GET /api/dispatch/{id}` — the cascade dispatch's live state.
class DispatchStatus {
  const DispatchStatus({
    required this.id,
    required this.status,
    required this.currentRadiusKm,
    required this.currentBatch,
    required this.createdAt,
    this.acceptedAgent,
  });

  final String id;
  final String status; // SEARCHING | MATCHED | EXPIRED | CANCELLED
  final int currentRadiusKm;
  final int currentBatch;
  final DateTime createdAt;
  final DispatchAcceptedAgent? acceptedAgent;

  factory DispatchStatus.fromJson(Map<String, dynamic> json) {
    final agentJson = json['acceptedAgent'] as Map<String, dynamic>?;
    return DispatchStatus(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'SEARCHING',
      currentRadiusKm: (json['currentRadiusKm'] as num?)?.toInt() ?? 1,
      currentBatch: (json['currentBatch'] as num?)?.toInt() ?? 1,
      createdAt: DateTime.parse(json['createdAt'] as String),
      acceptedAgent: agentJson != null ? DispatchAcceptedAgent.fromJson(agentJson) : null,
    );
  }
}
