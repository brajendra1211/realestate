import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/location_helper.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/auth_header.dart';
import '../../../core/widgets/form_error_banner.dart';
import '../../../core/widgets/form_section.dart';
import '../../../models/anti_bypass_agreement.dart';
import '../../../services/buyer_direct_visit_service.dart';

/// GPS-tagged (well — OTP-tagged; the app doesn't capture location yet, see
/// the API parity plan) physical visit flow: request an OTP for the owner
/// on-site, verify it, then sign the resulting anti-bypass legal deed.
class DirectVisitScreen extends StatefulWidget {
  const DirectVisitScreen({
    super.key,
    required this.agentListingId,
    this.propertyTitle,
  });

  final String agentListingId;
  final String? propertyTitle;

  @override
  State<DirectVisitScreen> createState() => _DirectVisitScreenState();
}

class _DirectVisitScreenState extends State<DirectVisitScreen> {
  late final BuyerDirectVisitService _service;
  final _notesController = TextEditingController();
  final _otpController = TextEditingController();
  final _otpFormKey = GlobalKey<FormState>();

  int _step = 0; // 0 = request OTP, 1 = verify OTP, 2 = agreement
  bool _submitting = false;
  String? _errorMessage;
  String? _visitId;
  AntiBypassAgreement? _agreement;

  @override
  void initState() {
    super.initState();
    _service = BuyerDirectVisitService(ApiClient.instance.dio);
  }

  @override
  void dispose() {
    _notesController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final notes = _notesController.text.trim();
      final position = await getCurrentLocation();
      final result = await _service.requestOtp(
        widget.agentListingId,
        notes: notes.isEmpty ? null : notes,
        latitude: position?.latitude,
        longitude: position?.longitude,
        locationAccuracy: position?.accuracy,
      );
      if (!mounted) return;
      setState(() {
        _visitId = result.visitId;
        _step = 1;
      });
    } on ApiException catch (e) {
      setState(() => _errorMessage = errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (!_otpFormKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final result = await _service.verifyOtp(_visitId!, _otpController.text.trim());
      if (!mounted) return;
      setState(() {
        _agreement = result.agreement;
        _step = 2;
      });
    } on ApiException catch (e) {
      setState(() => _errorMessage = errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _sign() async {
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final updated = await _service.signAgreement(_agreement!.id);
      if (!mounted) return;
      setState(() => _agreement = updated);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Agreement signed.')));
    } on ApiException catch (e) {
      setState(() => _errorMessage = errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify site visit')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            AuthHeader(
              title: _step == 2 ? 'Anti-bypass agreement' : "I'm at the property",
              subtitle: widget.propertyTitle ?? 'Confirm your on-site visit with the owner.',
            ),
            const SizedBox(height: AppSpacing.xl),
            if (_errorMessage != null) ...[
              FormErrorBanner(message: _errorMessage!),
              const SizedBox(height: AppSpacing.md),
            ],
            if (_step == 0) _buildRequestStep(),
            if (_step == 1) _buildVerifyStep(),
            if (_step == 2) _buildAgreementStep(),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FormSection(
          title: "Confirm you're on-site",
          subtitle: "We'll send a 6-digit OTP to the owner to confirm your visit.",
          stepNumber: 1,
          children: [
            TextFormField(
              controller: _notesController,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Notes for the owner (optional)'),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        AppButton(
          label: 'Send OTP to owner',
          expand: true,
          loading: _submitting,
          onPressed: _requestOtp,
        ),
      ],
    );
  }

  Widget _buildVerifyStep() {
    return Form(
      key: _otpFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FormSection(
            title: 'Enter the OTP',
            subtitle: 'Ask the owner for the 6-digit code sent to their phone.',
            stepNumber: 2,
            children: [
              TextFormField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'OTP',
                  prefixIcon: Icon(Icons.password_outlined),
                ),
                validator: (v) => Validators.required(v, label: 'OTP'),
                onFieldSubmitted: (_) => _verifyOtp(),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(
            label: 'Verify visit',
            expand: true,
            loading: _submitting,
            onPressed: _verifyOtp,
          ),
        ],
      ),
    );
  }

  Widget _buildAgreementStep() {
    final agreement = _agreement!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FormSection(
          title: 'Platform anti-bypass agreement',
          subtitle: 'A ${agreement.serviceFeePercent.toStringAsFixed(0)}% platform service fee '
              'applies if this deal closes within 12 months.',
          stepNumber: 3,
          children: [
            Text(agreement.propertyAddress, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: AppSpacing.sm),
            Text(agreement.legalTermsSummary, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        if (agreement.buyerSigned)
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Row(
              children: [
                Icon(Icons.verified, color: AppColors.success),
                SizedBox(width: AppSpacing.sm),
                Expanded(child: Text("You've signed this agreement.")),
              ],
            ),
          )
        else
          AppButton(
            label: 'Sign agreement',
            expand: true,
            loading: _submitting,
            onPressed: _sign,
          ),
      ],
    );
  }
}
