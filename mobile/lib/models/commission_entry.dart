/// Matches `GET /api/agent/commissions`'s `{ entries[], totals }` response.
class CommissionEntry {
  const CommissionEntry({
    required this.id,
    required this.type,
    required this.amount,
    this.note,
    required this.createdAt,
  });

  final String id;
  final String type; // CommissionType enum
  final int amount;
  final String? note;
  final DateTime createdAt;

  factory CommissionEntry.fromJson(Map<String, dynamic> json) {
    return CommissionEntry(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num).toInt(),
      note: json['note'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class CommissionsData {
  const CommissionsData({required this.entries, required this.totals});

  final List<CommissionEntry> entries;
  final Map<String, int> totals;

  int get grandTotal => totals.values.fold(0, (sum, v) => sum + v);

  factory CommissionsData.fromJson(Map<String, dynamic> json) {
    final totalsJson = json['totals'] as Map<String, dynamic>? ?? {};
    return CommissionsData(
      entries: (json['entries'] as List<dynamic>? ?? [])
          .map((e) => CommissionEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      totals: totalsJson.map((key, value) => MapEntry(key, (value as num).toInt())),
    );
  }
}
