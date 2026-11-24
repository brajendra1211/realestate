import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';

/// Property cart + requirement watch-list (customer) and the matching
/// agent-side calls ("I have a property", carts received, office visits).
class CartWatchService {
  CartWatchService(this._dio);

  final Dio _dio;

  Future<T> _wrap<T>(Future<T> Function() fn) async {
    try {
      return await fn();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // --- Customer ---
  Future<List<Map<String, dynamic>>> getCart() => _wrap(() async {
        final res = await _dio.get('/api/buyer/cart');
        return (res.data as List).cast<Map<String, dynamic>>();
      });

  Future<bool> toggleCart({String? agentListingId, String? propertyId}) => _wrap(() async {
        final res = await _dio.post('/api/buyer/cart', data: {
          if (agentListingId != null) 'agentListingId': agentListingId,
          if (propertyId != null) 'propertyId': propertyId,
        });
        return (res.data as Map<String, dynamic>)['inCart'] == true;
      });

  Future<void> removeFromCart(String itemId) =>
      _wrap(() => _dio.delete('/api/buyer/cart', queryParameters: {'id': itemId}));

  /// Share link, or send to an agent when [agentCode] is given.
  Future<Map<String, dynamic>> shareCart({String? agentCode, String? note}) => _wrap(() async {
        final res = await _dio.post('/api/buyer/cart/share', data: {
          if (agentCode != null && agentCode.isNotEmpty) 'agentCode': agentCode,
          if (note != null && note.isNotEmpty) 'note': note,
        });
        return res.data as Map<String, dynamic>;
      });

  Future<List<Map<String, dynamic>>> getMyRequirements() => _wrap(() async {
        final res = await _dio.get('/api/buyer/watchlist');
        return (res.data as List).cast<Map<String, dynamic>>();
      });

  Future<void> cancelRequirement(String id) =>
      _wrap(() => _dio.delete('/api/buyer/watchlist', queryParameters: {'id': id}));

  // --- Agent ---
  Future<List<Map<String, dynamic>>> getOpenRequirements() => _wrap(() async {
        final res = await _dio.get('/api/agent/watchlist');
        return (res.data as List).cast<Map<String, dynamic>>();
      });

  Future<void> haveProperty(String watchId) =>
      _wrap(() => _dio.post('/api/agent/watchlist', data: {'watchId': watchId}));

  Future<List<Map<String, dynamic>>> getReceivedCarts() => _wrap(() async {
        final res = await _dio.put('/api/agent/watchlist');
        return (res.data as List).cast<Map<String, dynamic>>();
      });

  Future<Map<String, dynamic>> getOfficeVisits() => _wrap(() async {
        final res = await _dio.get('/api/agent/office-visits');
        return res.data as Map<String, dynamic>;
      });
}
