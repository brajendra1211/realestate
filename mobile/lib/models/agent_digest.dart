/// Matches `GET /api/agent/digest`'s `{ totalCount, groups[] }` response —
/// "today, in a 10km radius, X new listings were added, in these
/// societies, these configs (2BHK/3BHK)."
class DigestGroup {
  const DigestGroup({required this.locality, this.bedrooms, required this.count});

  final String locality;
  final int? bedrooms;
  final int count;

  factory DigestGroup.fromJson(Map<String, dynamic> json) {
    return DigestGroup(
      locality: json['locality'] as String,
      bedrooms: (json['bedrooms'] as num?)?.toInt(),
      count: (json['count'] as num).toInt(),
    );
  }
}

class AgentDigest {
  const AgentDigest({required this.totalCount, required this.groups});

  final int totalCount;
  final List<DigestGroup> groups;

  factory AgentDigest.fromJson(Map<String, dynamic> json) {
    return AgentDigest(
      totalCount: (json['totalCount'] as num?)?.toInt() ?? 0,
      groups: (json['groups'] as List<dynamic>? ?? [])
          .map((e) => DigestGroup.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
