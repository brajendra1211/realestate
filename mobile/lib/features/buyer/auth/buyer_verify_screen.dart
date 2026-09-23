import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/auth_header.dart';
import '../../../core/widgets/form_error_banner.dart';
import '../../../core/widgets/form_section.dart';
import '../../../providers/customer_auth_provider.dart';

class BuyerVerifyScreen extends StatefulWidget {
  const BuyerVerifyScreen({
    super.key,
    required this.identifier,
    required this.channel,
    this.from,
  });

  final String identifier;
  final String channel;
  final String? from;

  @override
  State<BuyerVerifyScreen> createState() => _BuyerVerifyScreenState();
}

class _BuyerVerifyScreenState extends State<BuyerVerifyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();
  bool _submitting = false;
  bool _resending = false;
  String? _errorMessage;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final customerAuth = context.read<CustomerAuthProvider>();
      await customerAuth.verifyOtp(
        forInvestor: false,
        identifier: widget.identifier,
        otp: _otpController.text.trim(),
      );
      if (!mounted) return;
      context.go(widget.from ?? RoutePaths.buyerDashboard);
    } on ApiException catch (_) {
      setState(() => _errorMessage = 'That code isn\'t right — check and try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    try {
      final customerAuth = context.read<CustomerAuthProvider>();
      await customerAuth.requestOtp(forInvestor: false, identifier: widget.identifier);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('New code sent.')));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final via = widget.channel == 'EMAIL' ? 'email' : 'WhatsApp';
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Form(
            key: _formKey,
            child: ListView(
              children: [
                const SizedBox(height: AppSpacing.sm),
                AuthHeader(
                  title: 'Enter your code',
                  subtitle: 'We sent a 6-digit code via $via to ${widget.identifier}.',
                ),
                const SizedBox(height: AppSpacing.xl),
                if (_errorMessage != null) ...[
                  FormErrorBanner(message: _errorMessage!),
                  const SizedBox(height: AppSpacing.md),
                ],
                FormSection(
                  title: 'One-time code',
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
                      onFieldSubmitted: (_) => _submit(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: 'Verify & continue',
                  expand: true,
                  loading: _submitting,
                  onPressed: _submit,
                ),
                const SizedBox(height: AppSpacing.md),
                Center(
                  child: TextButton(
                    onPressed: _resending ? null : _resend,
                    child: Text(_resending ? 'Sending…' : 'Resend code'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
