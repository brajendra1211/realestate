/// Response of `GET /api/agent/subscription/status`.
class AgentSubscriptionStatus {
  const AgentSubscriptionStatus({
    this.agentCode,
    required this.primeStatus,
    required this.planTier,
    required this.visibilityDeprioritized,
    required this.walletBalance,
    required this.autoPayActive,
    this.autoPayMandate,
    this.currentSubscription,
    required this.daysRemaining,
    required this.renewalAlertActive,
  });

  final String? agentCode;
  final bool primeStatus;
  final String planTier; // BASIC | PRIME
  final bool visibilityDeprioritized;
  final int walletBalance;
  final bool autoPayActive;
  final String? autoPayMandate;
  final CurrentSubscription? currentSubscription;
  final int daysRemaining;
  final bool renewalAlertActive;

  factory AgentSubscriptionStatus.fromJson(Map<String, dynamic> json) {
    final current = json['currentSubscription'] as Map<String, dynamic>?;
    return AgentSubscriptionStatus(
      agentCode: json['agentCode'] as String?,
      primeStatus: json['primeStatus'] as bool? ?? false,
      planTier: json['planTier'] as String? ?? 'BASIC',
      visibilityDeprioritized: json['visibilityDeprioritized'] as bool? ?? false,
      walletBalance: (json['walletBalance'] as num?)?.toInt() ?? 0,
      autoPayActive: json['autoPayActive'] as bool? ?? false,
      autoPayMandate: json['autoPayMandate'] as String?,
      currentSubscription:
          current != null ? CurrentSubscription.fromJson(current) : null,
      daysRemaining: (json['daysRemaining'] as num?)?.toInt() ?? 0,
      renewalAlertActive: json['renewalAlertActive'] as bool? ?? false,
    );
  }
}

class CurrentSubscription {
  const CurrentSubscription({
    required this.id,
    required this.planName,
    required this.planPrice,
    required this.startDate,
    required this.endDate,
  });

  final String id;
  final String planName;
  final int planPrice;
  final DateTime startDate;
  final DateTime endDate;

  factory CurrentSubscription.fromJson(Map<String, dynamic> json) => CurrentSubscription(
        id: json['id'] as String,
        planName: json['planName'] as String? ?? '',
        planPrice: (json['planPrice'] as num?)?.toInt() ?? 0,
        startDate: DateTime.parse(json['startDate'] as String),
        endDate: DateTime.parse(json['endDate'] as String),
      );
}
