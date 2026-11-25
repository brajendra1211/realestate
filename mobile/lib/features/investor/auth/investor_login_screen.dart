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
import '../../../core/utils/input_formats.dart';
import '../../../core/widgets/login_method_toggle.dart';

class InvestorLoginScreen extends StatefulWidget {
  const InvestorLoginScreen({super.key});

  @override
  State<InvestorLoginScreen> createState() => _InvestorLoginScreenState();
}

class _InvestorLoginScreenState extends State<InvestorLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _usePassword = false;
  bool _obscure = true;
  bool _submitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _passwordController.dispose();
    _identifierController.dispose();
    super.dispose();
  }

  Future<void> _passwordLogin() async {
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      await context.read<CustomerAuthProvider>().loginWithPassword(
            email: _identifierController.text.trim(),
            password: _passwordController.text,
            expectedRole: 'INVESTOR',
          );
      if (!mounted) return;
      context.go(RoutePaths.investorDashboard);
    } on ApiException catch (e) {
      setState(() { _errorMessage = errorMessageFor(e); });
    } finally {
      if (mounted) setState(() { _submitting = false; });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_usePassword) return _passwordLogin();
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final customerAuth = context.read<CustomerAuthProvider>();
      final result = await customerAuth.requestOtp(
        forInvestor: true,
        identifier: _identifierController.text.trim(),
      );
      if (!mounted) return;
      context.push(
        '${RoutePaths.investorVerify}?identifier=${Uri.encodeComponent(result.identifier)}'
        '&channel=${result.channel}',
      );
    } on ApiException catch (e) {
      setState(() { _errorMessage = errorMessageFor(e); });
    } finally {
      if (mounted) setState(() { _submitting = false; });
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
                const AuthHeader(
                  title: 'Referral Partner login',
                  subtitle:
                      'Sign in with the phone or email your channel partner registered: a one-time code or your password.',
                ),
                const SizedBox(height: AppSpacing.xl),
                if (_errorMessage != null) ...[
                  FormErrorBanner(message: _errorMessage!),
                  const SizedBox(height: AppSpacing.md),
                ],
                LoginMethodToggle(
                  usePassword: _usePassword,
                  onChanged: (v) => setState(() { _usePassword = v; _errorMessage = null; }),
                ),
                const SizedBox(height: AppSpacing.md),
                FormSection(
                  title: 'Sign in',
                  children: [
                    TextFormField(
                      controller: _identifierController,
                      keyboardType: TextInputType.emailAddress,
                      inputFormatters: const [PhoneOrEmailFormatter()],
                      decoration: const InputDecoration(
                        labelText: 'Phone or email',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (v) => Validators.required(v, label: 'Phone or email'),
                      onFieldSubmitted: (_) => _usePassword ? null : _submit(),
                    ),
                    if (_usePassword)
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscure,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                            onPressed: () => setState(() { _obscure = !_obscure; }),
                          ),
                        ),
                        validator: (v) => Validators.required(v, label: 'Password'),
                        onFieldSubmitted: (_) => _submit(),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: _usePassword ? 'Sign in' : 'Send code',
                  expand: true,
                  loading: _submitting,
                  onPressed: _submit,
                ),
                const SizedBox(height: AppSpacing.md),
                const Center(
                  child: Text(
                    'Not registered yet? Ask your channel partner to add you as a referral partner.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: Colors.black54),
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
