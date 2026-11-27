import 'dart:async';

import '../utils/location_helper.dart';
import '../../services/location_service.dart';

/// Pings the agent's current GPS position to the server every couple of
/// minutes while the agent is logged in and the app is open, so the admin
/// live map (src/app/admin/live-map) shows something better than just the
/// fixed shop location. Foreground-only by design — no background service,
/// so it stops as soon as the app is backgrounded/closed, which keeps it out
/// of Play Store's stricter background-location review and battery impact.
class AgentLocationTracker {
  AgentLocationTracker._();

  static const _interval = Duration(seconds: 120);
  static Timer? _timer;
  static LocationService? _service;

  static void start(LocationService service) {
    if (_timer != null) return;
    _service = service;
    _pingOnce();
    _timer = Timer.periodic(_interval, (_) => _pingOnce());
  }

  static void stop() {
    _timer?.cancel();
    _timer = null;
    _service = null;
  }

  static Future<void> _pingOnce() async {
    final service = _service;
    if (service == null) return;
    final position = await getCurrentLocation();
    if (position == null) return;
    await service.pingLocation(position.latitude, position.longitude);
  }
}
