import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../network/api_client.dart';
import '../network/endpoints.dart';
import '../utils/location_helper.dart';

/// Live location is mandatory for every signed-in person (buyer, owner, investor, partner).
/// While [signedIn] is true this blocks the whole app until location is on, then keeps sending the
/// current position to the server (on start, every 90 s, and whenever the app comes back to the foreground).
/// Partners are buzzed by this live position instead of the shop address typed at registration.
class LiveLocationGate extends StatefulWidget {
  const LiveLocationGate({super.key, required this.signedIn, required this.child});

  final bool signedIn;
  final Widget child;

  @override
  State<LiveLocationGate> createState() => _LiveLocationGateState();
}

class _LiveLocationGateState extends State<LiveLocationGate> with WidgetsBindingObserver {
  bool _ok = false;
  bool _checking = false;
  bool _blocked = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.signedIn) _start();
  }

  @override
  void didUpdateWidget(LiveLocationGate old) {
    super.didUpdateWidget(old);
    if (widget.signedIn && !old.signedIn) {
      _start();
    } else if (!widget.signedIn && old.signedIn) {
      _timer?.cancel();
      setState(() { _ok = false; _blocked = false; });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && widget.signedIn) _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  void _start() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 90), (_) => _refresh());
    _refresh();
  }

  Future<void> _refresh({bool openSettings = false}) async {
    if (_checking || !widget.signedIn) return;
    _checking = true;
    if (mounted) setState(() {});
    final Position? pos = openSettings ? await getCurrentLocationOrSettings() : await getCurrentLocation();
    _checking = false;
    if (!mounted) return;
    if (pos == null) {
      setState(() { _ok = false; _blocked = true; });
      return;
    }
    setState(() { _ok = true; _blocked = false; });
    try {
      await ApiClient.instance.dio.post(Endpoints.liveLocation, data: {'latitude': pos.latitude, 'longitude': pos.longitude});
    } catch (_) {
      // A failed upload is retried on the next tick; the person is not blocked by a network error.
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.signedIn || _ok) return widget.child;
    return Stack(
      children: [
        widget.child,
        Positioned.fill(
          child: Material(
            color: Colors.white,
            child: SafeArea(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.location_on_rounded, size: 64, color: Color(0xFF1D4ED8)),
                      const SizedBox(height: 16),
                      Text('Turn on your location', style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
                      const SizedBox(height: 8),
                      Text(
                        'Pronesto needs your live location to match you with properties and nearby partners. Please allow location access to continue.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      if (_blocked) ...[
                        const SizedBox(height: 12),
                        const Text(
                          'Location is off or blocked. Tap the button, switch location on and allow it for this app.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
                        ),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _checking ? null : () => _refresh(openSettings: _blocked),
                          child: Text(_checking ? 'Checking…' : (_blocked ? 'Open location settings' : 'Allow location')),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
