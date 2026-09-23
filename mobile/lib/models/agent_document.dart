/// Matches `DocumentVaultItem` as returned by `GET/POST /api/agent/documents`.
class AgentDocument {
  const AgentDocument({
    required this.id,
    required this.type,
    required this.title,
    required this.url,
    required this.createdAt,
  });

  final String id;
  final String type; // DocumentVaultType enum, e.g. RERA_CERTIFICATE, OTHER, ...
  final String title;
  final String url;
  final DateTime createdAt;

  factory AgentDocument.fromJson(Map<String, dynamic> json) {
    return AgentDocument(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'OTHER',
      title: json['title'] as String? ?? '',
      url: json['url'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
