import 'package:geolocator/geolocator.dart';

/// Requests device location, handling permission prompts and service
/// checks. Returns null (never throws) when location isn't available —
/// callers decide whether that's fatal (dispatch) or just skippable
/// (direct-visit, where coordinates are optional).
Future<Position?> getCurrentLocation() async {
  if (!await Geolocator.isLocationServiceEnabled()) return null;

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied ||
      permission == LocationPermission.deniedForever) {
    return null;
  }

  try {
    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
  } catch (_) {
    return null;
  }
}
