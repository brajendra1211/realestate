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

/// Must be a top-level function (FCM runs it in a separate background
/// isolate) — fires when a data/notification message arrives while the app
/// is backgrounded or fully killed.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await _showLocalNotification(message);
}

Future<void> _showLocalNotification(RemoteMessage message) async {
  final notification = message.notification;
  if (notification == null) return;

  await _localNotifications.show(
    message.hashCode,
    notification.title,
    notification.body,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        'Nearby buyer alerts',
        channelDescription: 'Rings when a buyer scans a QR code near you.',
        importance: Importance.max,
        priority: Priority.high,
        sound: RawResourceAndroidNotificationSound('ring_alert'),
        enableVibration: true,
      ),
    ),
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
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    // Foreground messages don't auto-show a system notification — show one
    // ourselves so the ring is consistent whether the app is open or not.
    FirebaseMessaging.onMessage.listen(_showLocalNotification);
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
    } catch (_) {
      // Best-effort only.
    }
  }
}
