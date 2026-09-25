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
import '../../../providers/agent_auth_provider.dart';

enum _LoginMode { password, otp }

class AgentLoginScreen extends StatefulWidget {
  const AgentLoginScreen({super.key});

  @override
  State<AgentLoginScreen> createState() => _AgentLoginScreenState();
}

class _AgentLoginScreenState extends State<AgentLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  _LoginMode _mode = _LoginMode.password;
  bool _submitting = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  bool get _isPassword => _mode == _LoginMode.password;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final agentAuth = context.read<AgentAuthProvider>();
      final identifier = _identifierController.text.trim();
      final from = GoRouterState.of(context).uri.queryParameters['from'];

      if (_isPassword) {
        await agentAuth.login(loginId: identifier, password: _passwordController.text);
        if (!mounted) return;
        context.go(from ?? RoutePaths.agentDashboard);
      } else {
        final result = await agentAuth.requestOtp(identifier);
        if (!mounted) return;
        context.push(
          '${RoutePaths.agentVerify}?identifier=${Uri.encodeComponent(result.identifier)}'
          '&channel=${result.channel}'
          '${from != null ? '&from=${Uri.encodeComponent(from)}' : ''}',
        );
      }
    } on ApiException catch (e) {
      setState(() => _errorMessage = e.code == 'notFound'
          ? 'No channel partner account found for this phone or email. New channel partner? Register first.'
          : errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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
                  title: 'Welcome back',
                  subtitle: _isPassword
                      ? 'Log in with your channel partner email or phone and password.'
                      : "No password needed — we'll send a one-time code on WhatsApp (or email).",
                ),
                const SizedBox(height: AppSpacing.lg),
                SegmentedButton<_LoginMode>(
                  segments: const [
                    ButtonSegment(
                      value: _LoginMode.password,
                      label: Text('Password'),
                      icon: Icon(Icons.lock_outline),
                    ),
                    ButtonSegment(
                      value: _LoginMode.otp,
                      label: Text('OTP'),
                      icon: Icon(Icons.sms_outlined),
                    ),
                  ],
                  selected: {_mode},
                  onSelectionChanged: (selection) => setState(() {
                    _mode = selection.first;
                    _errorMessage = null;
                  }),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (_errorMessage != null) ...[
                  FormErrorBanner(message: _errorMessage!),
                  const SizedBox(height: AppSpacing.md),
                ],
                FormSection(
                  title: 'Sign in',
                  children: [
                    TextFormField(
                      controller: _identifierController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Login ID (email or phone)',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (v) => Validators.required(v, label: 'Login ID'),
                      onFieldSubmitted: (_) => _isPassword ? null : _submit(),
                    ),
                    if (_isPassword)
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined),
                            onPressed: () =>
                                setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                        validator: (v) => Validators.required(v, label: 'Password'),
                        onFieldSubmitted: (_) => _submit(),
                      ),
                  ],
                ),
                if (_isPassword)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => context.push(RoutePaths.agentForgotPassword),
                      child: const Text('Forgot password?'),
                    ),
                  ),
                const SizedBox(height: AppSpacing.lg),
                AppButton(
                  label: _isPassword ? 'Log in' : 'Send code',
                  expand: true,
                  loading: _submitting,
                  onPressed: _submit,
                ),
                const SizedBox(height: AppSpacing.md),
                Center(
                  child: TextButton(
                    onPressed: () => context.push(RoutePaths.agentRegister),
                    child: const Text('New channel partner? Register here'),
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
