/// Matches `Broadcast` shapes across the three broadcast endpoints:
/// nearby (`GET /api/agent/broadcast`), own (`GET /api/agent/broadcast/own`),
/// and creation payloads.
class Broadcast {
  const Broadcast({
    required this.id,
    this.society,
    required this.flatSize,
    required this.txnType,
    required this.budgetMin,
    required this.budgetMax,
    required this.radiusKm,
    required this.status,
    required this.createdAt,
    this.agentCode,
    this.distanceKm,
    required this.responses,
  });

  final String id;
  final String? society;
  final String flatSize;
  final String txnType; // RENT | BUY | SELL | LETOUT
  final int budgetMin;
  final int budgetMax;
  final int radiusKm;
  final String status; // OPEN | CLOSED
  final DateTime createdAt;
  final String? agentCode; // present on the nearby-broadcast shape
  final double? distanceKm; // present on the nearby-broadcast shape
  final List<BroadcastResponse> responses; // present on the own-broadcast shape

  factory Broadcast.fromJson(Map<String, dynamic> json) {
    final agent = json['agent'] as Map<String, dynamic>?;
    final responsesJson = json['responses'] as List<dynamic>?;
    return Broadcast(
      id: json['id'] as String,
      society: json['society'] as String?,
      flatSize: json['flatSize'] as String? ?? '',
      txnType: json['txnType'] as String? ?? 'BUY',
      budgetMin: (json['budgetMin'] as num?)?.toInt() ?? 0,
      budgetMax: (json['budgetMax'] as num?)?.toInt() ?? 0,
      radiusKm: (json['radiusKm'] as num?)?.toInt() ?? 1,
      status: json['status'] as String? ?? 'OPEN',
      createdAt: DateTime.parse(json['createdAt'] as String),
      agentCode: agent?['agentCode'] as String?,
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      responses: (responsesJson ?? [])
          .map((e) => BroadcastResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// One agent's response to a broadcast, as nested in the own-broadcast
/// shape's `responses[]` — carries the responder's agentCode/name so the
/// broadcast owner can pick who to chat with.
class BroadcastResponse {
  const BroadcastResponse({required this.agentId, this.agentCode, this.agentName});

  final String agentId;
  final String? agentCode;
  final String? agentName;

  factory BroadcastResponse.fromJson(Map<String, dynamic> json) {
    final agent = json['agent'] as Map<String, dynamic>?;
    final user = agent?['user'] as Map<String, dynamic>?;
    return BroadcastResponse(
      agentId: json['agentId'] as String,
      agentCode: agent?['agentCode'] as String?,
      agentName: user?['name'] as String?,
    );
  }
}

class AgentChatMessage {
  const AgentChatMessage({
    required this.id,
    required this.fromAgentId,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String fromAgentId;
  final String message;
  final DateTime createdAt;

  factory AgentChatMessage.fromJson(Map<String, dynamic> json) {
    return AgentChatMessage(
      id: json['id'] as String,
      fromAgentId: json['fromAgentId'] as String,
      message: json['message'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
