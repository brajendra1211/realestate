/// Matches `GET /api/leaderboard`'s `{ agentsOfWeek, ticker, areaDominance }`
/// gamification response.
class AgentOfWeekCard {
  const AgentOfWeekCard({
    required this.agentCode,
    required this.agentName,
    required this.city,
    required this.badge,
  });

  final String agentCode;
  final String agentName;
  final String? city;
  final String badge; // TOP_SELLER | FASTEST_RESPONDER | 5-STAR

  factory AgentOfWeekCard.fromJson(Map<String, dynamic> json) {
    return AgentOfWeekCard(
      agentCode: json['agentCode'] as String,
      agentName: json['agentName'] as String,
      city: json['city'] as String?,
      badge: json['badge'] as String,
    );
  }
}

class TickerItem {
  const TickerItem({required this.agentCode, required this.label, required this.at});

  final String agentCode;
  final String label;
  final DateTime at;

  factory TickerItem.fromJson(Map<String, dynamic> json) {
    return TickerItem(
      agentCode: json['agentCode'] as String,
      label: json['label'] as String,
      at: DateTime.parse(json['at'] as String),
    );
  }
}

class AreaDominance {
  const AreaDominance({
    required this.area,
    required this.agentCode,
    required this.agentName,
    required this.listingCount,
  });

  final String area;
  final String agentCode;
  final String agentName;
  final int listingCount;

  factory AreaDominance.fromJson(Map<String, dynamic> json) {
    return AreaDominance(
      area: json['area'] as String,
      agentCode: json['agentCode'] as String,
      agentName: json['agentName'] as String,
      listingCount: (json['listingCount'] as num).toInt(),
    );
  }
}

class LeaderboardData {
  const LeaderboardData({
    required this.agentsOfWeek,
    required this.ticker,
    required this.areaDominance,
  });

  final List<AgentOfWeekCard> agentsOfWeek;
  final List<TickerItem> ticker;
  final List<AreaDominance> areaDominance;

  factory LeaderboardData.fromJson(Map<String, dynamic> json) {
    return LeaderboardData(
      agentsOfWeek: (json['agentsOfWeek'] as List<dynamic>? ?? [])
          .map((e) => AgentOfWeekCard.fromJson(e as Map<String, dynamic>))
          .toList(),
      ticker: (json['ticker'] as List<dynamic>? ?? [])
          .map((e) => TickerItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      areaDominance: (json['areaDominance'] as List<dynamic>? ?? [])
          .map((e) => AreaDominance.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
