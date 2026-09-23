import '../network/api_client.dart';

/// Resolves a possibly-relative media URL (the backend returns upload
/// paths like `/uploads/xyz.webp`, not absolute URLs) against the API
/// base URL.
String resolveMediaUrl(String url) {
  if (url.isEmpty) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  final path = url.startsWith('/') ? url : '/$url';
  return '${ApiClient.baseUrl}$path';
}
