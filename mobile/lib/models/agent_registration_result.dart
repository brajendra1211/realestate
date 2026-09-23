/// Response shape of `POST /api/agent/register`.
class AgentRegistrationResult {
  const AgentRegistrationResult({
    required this.userId,
    required this.agentProfileId,
    required this.status,
  });

  final String userId;
  final String agentProfileId;
  final String status; // PENDING | APPROVED | REJECTED

  factory AgentRegistrationResult.fromJson(Map<String, dynamic> json) {
    return AgentRegistrationResult(
      userId: json['userId'] as String,
      agentProfileId: json['agentProfileId'] as String,
      status: json['status'] as String,
    );
  }
}
