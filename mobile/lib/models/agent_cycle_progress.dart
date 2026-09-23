/// The six target/achieved counters tracked per 60-day review cycle.
class CycleCounts {
  const CycleCounts({
    required this.listings,
    required this.deals,
    required this.visits,
    required this.customerProperties,
    required this.investors,
    required this.directAgents,
  });

  final int listings;
  final int deals;
  final int visits;
  final int customerProperties;
  final int investors;
  final int directAgents;

  factory CycleCounts.fromJson(Map<String, dynamic> json) => CycleCounts(
        listings: (json['listings'] as num?)?.toInt() ?? 0,
        deals: (json['deals'] as num?)?.toInt() ?? 0,
        visits: (json['visits'] as num?)?.toInt() ?? 0,
        customerProperties: (json['customerProperties'] as num?)?.toInt() ?? 0,
        investors: (json['investors'] as num?)?.toInt() ?? 0,
        directAgents: (json['directAgents'] as num?)?.toInt() ?? 0,
      );
}

class CycleCoupon {
  const CycleCoupon({
    required this.code,
    required this.discountPercent,
    required this.expiresAt,
  });

  final String code;
  final int discountPercent;
  final DateTime expiresAt;

  factory CycleCoupon.fromJson(Map<String, dynamic> json) => CycleCoupon(
        code: json['code'] as String,
        discountPercent: (json['discountPercent'] as num?)?.toInt() ?? 20,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
      );
}

/// Response of `GET /api/agent/cycle`.
class AgentCycleProgress {
  const AgentCycleProgress({
    required this.cycleStartDate,
    required this.cycleEndDate,
    required this.daysRemaining,
    required this.planTier,
    required this.trafficLight,
    required this.targets,
    required this.achieved,
    required this.isTargetMet,
    required this.carryForwardScore,
    required this.cycleCompletedCount,
    this.coupon,
  });

  final DateTime cycleStartDate;
  final DateTime cycleEndDate;
  final int daysRemaining;
  final String planTier; // BASIC | PRIME
  final String trafficLight; // GREEN | YELLOW | RED
  final CycleCounts targets;
  final CycleCounts achieved;
  final bool isTargetMet;
  final int carryForwardScore;
  final int cycleCompletedCount;
  final CycleCoupon? coupon;

  factory AgentCycleProgress.fromJson(Map<String, dynamic> json) {
    final couponJson = json['coupon'] as Map<String, dynamic>?;
    return AgentCycleProgress(
      cycleStartDate: DateTime.parse(json['cycleStartDate'] as String),
      cycleEndDate: DateTime.parse(json['cycleEndDate'] as String),
      daysRemaining: (json['daysRemaining'] as num?)?.toInt() ?? 0,
      planTier: json['planTier'] as String? ?? 'BASIC',
      trafficLight: json['trafficLight'] as String? ?? 'YELLOW',
      targets: CycleCounts.fromJson(json['targets'] as Map<String, dynamic>? ?? const {}),
      achieved: CycleCounts.fromJson(json['achieved'] as Map<String, dynamic>? ?? const {}),
      isTargetMet: json['isTargetMet'] as bool? ?? false,
      carryForwardScore: (json['carryForwardScore'] as num?)?.toInt() ?? 0,
      cycleCompletedCount: (json['cycleCompletedCount'] as num?)?.toInt() ?? 0,
      coupon: couponJson != null ? CycleCoupon.fromJson(couponJson) : null,
    );
  }
}
