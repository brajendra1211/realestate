import 'dart:async';
import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../services/push_service.dart';

const _channelId = 'shop_scan_alerts';

const AndroidNotificationChannel _channel = AndroidNotificationChannel(
  _channelId,
  'Nearby buyer alerts',
  description: 'Rings when a buyer scans a QR code near you.',
  importance: Importance.max,
  playSound: true,
  sound: RawResourceAndroidNotificationSound('ring_alert'),
  enableVibration: true,
);

final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

/// Fires with a ring's fields every time a "property-ring" notification is
/// tapped (or auto-launches full-screen) while the app is already alive —
/// `app.dart` stays subscribed for the app's whole lifetime and sends the
/// router straight to the incoming-ring screen on every event. For a fully
/// cold start, see [PushNotifications.takeLaunchRingPayload] instead — a
/// broadcast stream drops events with nobody listening yet, which a cold
/// start always is.
final StreamController<Map<String, String>> ringTapped =
    StreamController<Map<String, String>>.broadcast();

Map<String, String>? _parseRingPayload(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  try {
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    if (decoded['type'] != 'property-ring') return null;
    return decoded.map((key, value) => MapEntry(key, value.toString()));
  } catch (_) {
    return null;
  }
}

/// Builds the `/agent/incoming-ring` location for a parsed ring payload —
/// shared by the cold-start path (splash screen) and the live-tap path
/// (app.dart), so both navigate identically.
String incomingRingLocation(Map<String, String> data) {
  final params = <String, String>{
    'propertyId': data['propertyId'] ?? '',
    'propertyTitle': data['propertyTitle'] ?? '',
    'buyerName': data['buyerName'] ?? '',
    'buyerPhone': data['buyerPhone'] ?? '',
  };
  final query = params.entries
      .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
      .join('&');
  return '/agent/incoming-ring?$query';
}

// Shared by both the foreground and background tap callbacks below — must be
// a top-level/static function for the background one (FCM/flutter_local_
// notifications run it in a separate isolate when the app isn't in the
// foreground).
@pragma('vm:entry-point')
void _onNotificationResponse(NotificationResponse response) {
  final data = _parseRingPayload(response.payload);
  if (data != null) ringTapped.add(data);
}

/// Must be a top-level function (FCM runs it in a separate background
/// isolate) — fires when a data message arrives while the app is
/// backgrounded or fully killed.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await _showLocalNotification(message);
}

Future<void> _showLocalNotification(RemoteMessage message) async {
  // Every push this app sends is data-only (see src/lib/push.ts) so it
  // always reaches here — foreground, background, or killed alike — instead
  // of Android auto-displaying a "notification"-shaped message itself and
  // bypassing the fullScreenIntent/category/payload set up below.
  final data = message.data;
  final title = data['title'];
  final body = data['body'];
  if (title == null || body == null) return;

  final isRing = data['type'] == 'property-ring';

  // fullScreenIntent only escalates to an actual takeover when the app
  // *isn't* already the foregrounded, focused activity — if the agent is
  // already looking at the app when a ring arrives, Android has nowhere
  // further to "escalate" to, so it just queues the notification quietly
  // instead. Jumping straight to the incoming-ring screen here covers that
  // case the same way a real call would.
  final ringPayload = _parseRingPayload(jsonEncode(data));
  if (ringPayload != null) ringTapped.add(ringPayload);

  await _localNotifications.show(
    message.hashCode,
    title,
    body,
    NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        'Nearby buyer alerts',
        channelDescription: 'Rings when a buyer scans a QR code near you.',
        importance: Importance.max,
        priority: Priority.high,
        sound: const RawResourceAndroidNotificationSound('ring_alert'),
        enableVibration: true,
        // Only a channel-partner "ring" takes over the screen like a call —
        // a QR-scan "buyer nearby" alert stays a normal notification. Also
        // the fallback path whenever USE_FULL_SCREEN_INTENT isn't granted
        // (Android 14+ doesn't auto-grant it to non-calling apps): Android
        // itself downgrades this to an ordinary heads-up notification, so
        // nothing extra to handle on our side for that case.
        fullScreenIntent: isRing,
        category: isRing ? AndroidNotificationCategory.call : null,
      ),
    ),
    payload: jsonEncode(data),
  );
}

/// One-time app-startup setup — creates the Android notification channel and
/// wires the foreground/background FCM handlers. Call from main() before
/// runApp(), before any login has happened.
class PushNotifications {
  PushNotifications._();

  static Future<void> init() async {
    await _localNotifications.initialize(
      const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
      onDidReceiveNotificationResponse: _onNotificationResponse,
      onDidReceiveBackgroundNotificationResponse: _onNotificationResponse,
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    // Foreground messages don't auto-show a system notification — show one
    // ourselves so the ring is consistent whether the app is open or not.
    FirebaseMessaging.onMessage.listen(_showLocalNotification);
  }

  /// Call once at startup (from the splash screen, after the router exists)
  /// to pick up a ring that cold-launched the app, before anything was
  /// listening on [ringTapped].
  static Future<Map<String, String>?> takeLaunchRingPayload() async {
    final details = await _localNotifications.getNotificationAppLaunchDetails();
    if (details?.didNotificationLaunchApp != true) return null;
    return _parseRingPayload(details!.notificationResponse?.payload);
  }

  /// Call once after a channel partner logs in — requests the notification
  /// permission, grabs this device's FCM token, and registers it with the
  /// server. Silently does nothing on failure (permission denied, no
  /// network, etc.) — never blocks or fails the login flow itself.
  static Future<void> registerForCurrentUser(PushService pushService) async {
    try {
      final settings = await FirebaseMessaging.instance.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;

      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;

      await pushService.registerToken(token);

      // Android 14+ doesn't auto-grant USE_FULL_SCREEN_INTENT to regular
      // apps. This resolves instantly (no UI) if already granted; otherwise
      // it sends the agent to the one-time system Settings screen. Declining
      // just means they keep the existing heads-up notification instead of
      // the full-screen takeover — never blocks login either way.
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestFullScreenIntentPermission();
    } catch (_) {
      // Best-effort only.
    }
  }
}
