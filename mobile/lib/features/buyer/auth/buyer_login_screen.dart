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
import '../../../core/widgets/form_section.dart';
import '../../../providers/customer_auth_provider.dart';
import '../../../core/utils/input_formats.dart';
import '../../../core/widgets/login_method_toggle.dart';
import '../../../core/widgets/blink_error.dart';

class BuyerLoginScreen extends StatefulWidget {
  const BuyerLoginScreen({super.key});

  @override
  State<BuyerLoginScreen> createState() => _BuyerLoginScreenState();
}

class _BuyerLoginScreenState extends State<BuyerLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _usePassword = false;
  bool _obscure = true;
  bool _submitting = false;
  String? _errorMessage;
  int _tick = 0;
  bool _isPwErr(String? m) =>
      m != null &&
      RegExp(r'password|incorrect|wrong', caseSensitive: false).hasMatch(m);

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
        expectedRole: 'BUYER',
      );
      if (!mounted) return;
      final from = GoRouterState.of(context).uri.queryParameters['from'];
      context.go(from ?? RoutePaths.buyerDashboard);
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = errorMessageFor(e);
        _tick++;
      });
    } finally {
      if (mounted)
        setState(() {
          _submitting = false;
        });
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
        forInvestor: false,
        identifier: _identifierController.text.trim(),
      );
      if (!mounted) return;
      final from = GoRouterState.of(context).uri.queryParameters['from'];
      context.push(
        '${RoutePaths.buyerVerify}?identifier=${Uri.encodeComponent(result.identifier)}'
        '&channel=${result.channel}'
        '${from != null ? '&from=${Uri.encodeComponent(from)}' : ''}',
      );
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = errorMessageFor(e);
        _tick++;
      });
    } finally {
      if (mounted)
        setState(() {
          _submitting = false;
        });
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
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: IntrinsicHeight(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const AuthHeader(
                          title: 'Sign in',
                          subtitle:
                              'Buyer sign-in. Enter your phone or email and we will send a one-time code.',
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        LoginMethodToggle(
                          usePassword: _usePassword,
                          onChanged: (v) => setState(() {
                            _usePassword = v;
                            _errorMessage = null;
                          }),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        FormSection(
                          title: 'Sign in',
                          children: [
                            BlinkError(
                              trigger: _tick,
                              child: TextFormField(
                                forceErrorText:
                                    (_usePassword && _isPwErr(_errorMessage))
                                    ? null
                                    : _errorMessage,
                                controller: _identifierController,
                                keyboardType: TextInputType.emailAddress,
                                inputFormatters: const [
                                  PhoneOrEmailFormatter(),
                                ],
                                decoration: const InputDecoration(
                                  labelText: 'Phone or email',
                                  prefixIcon: Icon(Icons.person_outline),
                                ),
                                validator: Validators.phoneOrEmail,
                                onFieldSubmitted: (_) =>
                                    _usePassword ? null : _submit(),
                              ),
                            ),
                            if (_usePassword)
                              BlinkError(
                                trigger: _tick,
                                child: TextFormField(
                                  forceErrorText:
                                      (_usePassword && _isPwErr(_errorMessage))
                                      ? _errorMessage
                                      : null,
                                  controller: _passwordController,
                                  obscureText: _obscure,
                                  decoration: InputDecoration(
                                    labelText: 'Password',
                                    prefixIcon: const Icon(Icons.lock_outline),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscure
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                      ),
                                      onPressed: () => setState(() {
                                        _obscure = !_obscure;
                                      }),
                                    ),
                                  ),
                                  validator: (v) =>
                                      Validators.required(v, label: 'Password'),
                                  onFieldSubmitted: (_) => _submit(),
                                ),
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
                            'New here? Just enter your number — your account is created automatically after the code.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.black54,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
