/// Matches `GET /api/agent/ratings`'s `{ ratings[], count }` response.
class AgentRatingEntry {
  const AgentRatingEntry({
    required this.id,
    required this.stars,
    this.review,
    required this.createdAt,
  });

  final String id;
  final int stars;
  final String? review;
  final DateTime createdAt;

  factory AgentRatingEntry.fromJson(Map<String, dynamic> json) {
    return AgentRatingEntry(
      id: json['id'] as String,
      stars: (json['stars'] as num).toInt(),
      review: json['review'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class AgentRatingsData {
  const AgentRatingsData({required this.ratings, required this.count});

  final List<AgentRatingEntry> ratings;
  final int count;

  factory AgentRatingsData.fromJson(Map<String, dynamic> json) {
    return AgentRatingsData(
      ratings: (json['ratings'] as List<dynamic>? ?? [])
          .map((e) => AgentRatingEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}
