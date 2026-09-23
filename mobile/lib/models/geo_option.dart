/// A single `{ id, name }` row shared by every `/api/geo/*` list endpoint
/// (countries, states, cities, localities).
class GeoOption {
  const GeoOption({required this.id, required this.name});

  final String id;
  final String name;

  factory GeoOption.fromJson(Map<String, dynamic> json) => GeoOption(
        id: json['id'] as String,
        name: json['name'] as String,
      );
}
