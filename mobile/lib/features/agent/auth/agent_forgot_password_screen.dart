import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/auth_header.dart';
import '../../../core/widgets/form_error_banner.dart';
import '../../../core/widgets/form_section.dart';
import '../../../providers/agent_auth_provider.dart';

/// Two steps on one screen: request a code for the agent's phone/email, then
/// enter the code with a new password.
class AgentForgotPasswordScreen extends StatefulWidget {
  const AgentForgotPasswordScreen({super.key});

  @override
  State<AgentForgotPasswordScreen> createState() => _AgentForgotPasswordScreenState();
}

class _AgentForgotPasswordScreenState extends State<AgentForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _codeSent = false;
  String _identifier = '';
  String _channel = 'WHATSAPP';
  bool _submitting = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _identifierController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final result = await context
          .read<AgentAuthProvider>()
          .requestOtp(_identifierController.text.trim());
      if (!mounted) return;
      setState(() {
        _codeSent = true;
        _identifier = result.identifier;
        _channel = result.channel;
      });
    } on ApiException catch (e) {
      setState(() => _errorMessage = e.code == 'notFound'
          ? 'No agent account found for this phone or email.'
          : errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _resetPassword() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      await context.read<AgentAuthProvider>().resetPassword(
            identifier: _identifier,
            otp: _otpController.text.trim(),
            password: _passwordController.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password updated. Please log in with your new password.')),
      );
      context.pop();
    } on ApiException catch (e) {
      setState(() => _errorMessage = e.code == 'invalid_otp'
          ? "That code isn't right or has expired."
          : errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final via = _channel == 'EMAIL' ? 'email' : 'WhatsApp';
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Form(
            key: _formKey,
            child: ListView(
              children: [
                AuthHeader(
                  title: 'Reset password',
                  subtitle: _codeSent
                      ? 'We sent a 6-digit code via $via to $_identifier. Enter it with your new password.'
                      : "Enter your agent phone or email and we'll send you a code.",
                ),
                const SizedBox(height: AppSpacing.xl),
                if (_errorMessage != null) ...[
                  FormErrorBanner(message: _errorMessage!),
                  const SizedBox(height: AppSpacing.md),
                ],
                if (!_codeSent) ...[
                  FormSection(
                    title: 'Your account',
                    children: [
                      TextFormField(
                        controller: _identifierController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Phone or email',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: (v) => Validators.required(v, label: 'Phone or email'),
                        onFieldSubmitted: (_) => _sendCode(),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  AppButton(
                    label: 'Send code',
                    expand: true,
                    loading: _submitting,
                    onPressed: _sendCode,
                  ),
                ] else ...[
                  FormSection(
                    title: 'New password',
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
                      ),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'New password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined),
                            onPressed: () =>
                                setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                        validator: Validators.password,
                      ),
                      TextFormField(
                        controller: _confirmController,
                        obscureText: _obscurePassword,
                        decoration: const InputDecoration(
                          labelText: 'Confirm new password',
                          prefixIcon: Icon(Icons.lock_outline),
                        ),
                        validator: (v) =>
                            v != _passwordController.text ? 'Passwords do not match' : null,
                        onFieldSubmitted: (_) => _resetPassword(),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  AppButton(
                    label: 'Update password',
                    expand: true,
                    loading: _submitting,
                    onPressed: _resetPassword,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Center(
                    child: TextButton(
                      onPressed: _submitting ? null : _sendCode,
                      child: const Text('Resend code'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
