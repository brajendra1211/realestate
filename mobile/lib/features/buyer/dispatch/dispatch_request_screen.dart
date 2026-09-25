import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/location_helper.dart';
import '../../../core/widgets/app_button.dart';
import '../../../models/dispatch_status.dart';
import '../../../services/buyer_dispatch_service.dart';

/// Uber-style "get me an agent now" flow. Polls the dispatch's status every
/// 4s while searching — the same lightweight REST-polling stand-in for
/// realtime updates used by `broadcast_detail_chat_screen.dart`.
class DispatchRequestScreen extends StatefulWidget {
  const DispatchRequestScreen({super.key});

  @override
  State<DispatchRequestScreen> createState() => _DispatchRequestScreenState();
}

class _DispatchRequestScreenState extends State<DispatchRequestScreen> {
  late final BuyerDispatchService _service;
  Timer? _pollTimer;
  bool _requesting = false;
  String? _errorMessage;
  String? _dispatchId;
  DispatchStatus? _status;

  @override
  void initState() {
    super.initState();
    _service = BuyerDispatchService(ApiClient.instance.dio);
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _request() async {
    setState(() {
      _requesting = true;
      _errorMessage = null;
    });
    try {
      final position = await getCurrentLocation();
      if (position == null) {
        setState(() => _errorMessage =
            'Location is required to find nearby channel partners. Please enable location access and try again.');
        return;
      }
      final id = await _service.requestDispatch(position.latitude, position.longitude);
      if (!mounted) return;
      setState(() => _dispatchId = id);
      _pollStatus();
      _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => _pollStatus());
    } on ApiException catch (e) {
      setState(() => _errorMessage = errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  Future<void> _pollStatus() async {
    if (_dispatchId == null) return;
    try {
      final status = await _service.getStatus(_dispatchId!);
      if (!mounted) return;
      setState(() => _status = status);
      if (status.status != 'SEARCHING') _pollTimer?.cancel();
    } catch (_) {
      // Silently retried on the next tick.
    }
  }

  Future<void> _cancel() async {
    if (_dispatchId == null) return;
    try {
      await _service.cancel(_dispatchId!);
    } on ApiException catch (_) {
      // Already matched/expired server-side — the next poll will reflect it.
    } finally {
      _pollTimer?.cancel();
      if (mounted) {
        setState(() {
          _dispatchId = null;
          _status = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Find a channel partner now')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Center(child: _buildBody()),
        ),
      ),
    );
  }

  Widget _buildBody() {
    final status = _status;
    if (status == null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.travel_explore, size: 64, color: AppColors.gold),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'We\'ll match you with the nearest available channel partner — first to '
            'respond gets you.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.danger),
            ),
          ],
          const SizedBox(height: AppSpacing.xl),
          AppButton(
            label: 'Find me a channel partner',
            loading: _requesting,
            onPressed: _request,
          ),
        ],
      );
    }

    switch (status.status) {
      case 'MATCHED':
        final agent = status.acceptedAgent;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, size: 64, color: AppColors.success),
            const SizedBox(height: AppSpacing.lg),
            Text('Matched!', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: AppSpacing.sm),
            if (agent != null) ...[
              Text(
                [agent.shopName, agent.agentCode].where((s) => s != null).join(' · '),
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              if (agent.phone != null) Text(agent.phone!),
            ],
            const SizedBox(height: AppSpacing.xl),
            AppButton(
              label: 'Done',
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        );
      case 'EXPIRED':
      case 'CANCELLED':
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline, size: 64, color: AppColors.textMuted),
            const SizedBox(height: AppSpacing.lg),
            Text(
              status.status == 'CANCELLED'
                  ? 'Request cancelled.'
                  : 'No channel partner responded in time.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.xl),
            AppButton(
              label: 'Try again',
              onPressed: () => setState(() {
                _status = null;
                _dispatchId = null;
              }),
            ),
          ],
        );
      default: // SEARCHING
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: AppColors.gold),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Searching within ${status.currentRadiusKm}km · batch ${status.currentBatch}...',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.xl),
            AppButton(
              label: 'Cancel',
              variant: AppButtonVariant.secondary,
              onPressed: _cancel,
            ),
          ],
        );
    }
  }
}
