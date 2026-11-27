import 'package:geolocator/geolocator.dart';

/// When the user taps "turn on location": sends them to the right settings page if location
/// is switched off or the permission was blocked, otherwise just asks as usual.
Future<Position?> getCurrentLocationOrSettings() async {
  if (!await Geolocator.isLocationServiceEnabled()) {
    await Geolocator.openLocationSettings();
    return null;
  }
  if (await Geolocator.checkPermission() == LocationPermission.deniedForever) {
    await Geolocator.openAppSettings();
    return null;
  }
  return getCurrentLocation();
}

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
