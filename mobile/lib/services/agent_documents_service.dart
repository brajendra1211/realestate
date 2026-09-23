import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import '../core/network/endpoints.dart';
import '../models/agent_document.dart';

class AgentDocumentsService {
  AgentDocumentsService(this._dio);

  final Dio _dio;

  Future<List<AgentDocument>> getDocuments() async {
    try {
      final res = await _dio.get(Endpoints.agentDocuments);
      final data = res.data as List<dynamic>;
      return data
          .map((e) => AgentDocument.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Uploads the file (`/api/upload/document`, PDF only, ≤15MB — enforced
  /// server-side) then registers it in the agent's document vault.
  Future<AgentDocument> addDocument({
    required String filePath,
    required String title,
    required String type,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });
      final uploadRes = await _dio.post(Endpoints.uploadDocument, data: formData);
      final url = (uploadRes.data as Map<String, dynamic>)['url'] as String;

      final res = await _dio.post(
        Endpoints.agentDocuments,
        data: {'title': title, 'type': type, 'url': url},
      );
      return AgentDocument.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
