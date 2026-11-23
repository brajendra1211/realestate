import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/endpoints.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';

/// Two notification switches for the partner:
///  - Buzzer alerts: ring when a buyer / owner / dispatch lead comes in.
///  - New property alerts: alert when a property is listed near the shop.
/// Leads stay visible inside the app either way; only the alert is skipped.
class AgentSettingsScreen extends StatefulWidget {
  const AgentSettingsScreen({super.key});

  @override
  State<AgentSettingsScreen> createState() => _AgentSettingsScreenState();
}

class _AgentSettingsScreenState extends State<AgentSettingsScreen> {
  final Dio _dio = ApiClient.instance.dio;
  bool _loading = true;
  bool _saving = false;
  String? _error;
  bool _buzzer = true;
  bool _listing = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _dio.get(Endpoints.agentSettings);
      final data = res.data as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _buzzer = data['buzzerAlerts'] as bool? ?? true;
        _listing = data['listingAlerts'] as bool? ?? true;
        _loading = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = errorMessageFor(ApiException.fromDioError(e));
        _loading = false;
      });
    }
  }

  Future<void> _save({bool? buzzer, bool? listing}) async {
    final prevBuzzer = _buzzer;
    final prevListing = _listing;
    setState(() {
      if (buzzer != null) _buzzer = buzzer;
      if (listing != null) _listing = listing;
      _saving = true;
    });
    try {
      await _dio.patch(
        Endpoints.agentSettings,
        data: {'buzzerAlerts': ?buzzer, 'listingAlerts': ?listing},
      );
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _buzzer = prevBuzzer;
        _listing = prevListing;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMessageFor(ApiException.fromDioError(e)))),
      );
    } finally {
      if (mounted) setState(() { _saving = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!),
                      TextButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  children: [
                    SwitchListTile(
                      secondary: const Icon(Icons.notifications_active_outlined),
                      title: const Text('Buzzer alerts'),
                      subtitle: const Text(
                        'Ring me when a new buyer, owner or dispatch lead comes in. '
                        'Turn off and the buzzer will not ring on this account.',
                      ),
                      value: _buzzer,
                      onChanged: _saving ? null : (v) => _save(buzzer: v),
                    ),
                    const Divider(),
                    SwitchListTile(
                      secondary: const Icon(Icons.home_work_outlined),
                      title: const Text('New property alerts'),
                      subtitle: const Text(
                        'Notify me when a new property is listed near my shop. '
                        'Turn off to stop these notifications.',
                      ),
                      value: _listing,
                      onChanged: _saving ? null : (v) => _save(listing: v),
                    ),
                  ],
                ),
    );
  }
}
