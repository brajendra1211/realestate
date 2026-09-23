import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

/// Single Dio instance shared by every service, with a persistent cookie
/// jar so the NextAuth session cookie survives app restarts. Created once
/// in `main()` before `runApp`.
class ApiClient {
  ApiClient._();

  static final ApiClient instance = ApiClient._();

  /// Points at the live BayaEstate backend by default. Overridable per run
  /// target, e.g. for local dev:
  /// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000`
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://noidaprimeproperty.com',
  );

  late final Dio dio;
  late final PersistCookieJar cookieJar;
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;

    final dir = await getApplicationDocumentsDirectory();
    cookieJar = PersistCookieJar(
      storage: FileStorage('${dir.path}/.cookies/'),
    );

    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        headers: const {'Accept': 'application/json'},
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );
    dio.interceptors.add(CookieManager(cookieJar));

    _initialized = true;
  }
}
