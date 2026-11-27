import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_exception.dart';
import '../../core/router/route_paths.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/error_messages.dart';
import '../../core/utils/input_formats.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/auth_header.dart';
import '../../core/widgets/login_method_toggle.dart';
import '../../providers/customer_auth_provider.dart';
import '../../core/widgets/back_app_bar.dart';
import '../../core/widgets/blink_error.dart';

/// Owner login: a one-time code on WhatsApp, or email / mobile and the password chosen when listing.
class OwnerLoginScreen extends StatefulWidget {
  const OwnerLoginScreen({super.key});

  @override
  State<OwnerLoginScreen> createState() => _OwnerLoginScreenState();
}

class _OwnerLoginScreenState extends State<OwnerLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _usePassword = false;
  bool _obscure = true;
  bool _busy = false;
  String? _error;
  int _tick = 0;
  bool _isPwErr(String? m) =>
      m != null &&
      RegExp(r'password|incorrect|wrong', caseSensitive: false).hasMatch(m);

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = context.read<CustomerAuthProvider>();
    try {
      if (_usePassword) {
        await auth.loginWithPassword(
          email: _identifier.text.trim(),
          password: _password.text,
          expectedRole: 'OWNER',
        );
        if (!mounted) return;
        context.go(RoutePaths.ownerStatus);
      } else {
        final r = await auth.requestOtpFor('owner', _identifier.text.trim());
        if (!mounted) return;
        context.push(
          '${RoutePaths.buyerVerify}?identifier=${Uri.encodeComponent(r.identifier)}&channel=${r.channel}&panel=owner',
        );
      }
    } on ApiException catch (e) {
      setState(() {
        _error = errorMessageFor(e);
        _tick++;
      });
    } finally {
      if (mounted)
        setState(() {
          _busy = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: BackAppBar(),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              const AuthHeader(
                title: 'Owner login',
                subtitle: 'Track your property and its verification.',
              ),
              const SizedBox(height: AppSpacing.lg),
              LoginMethodToggle(
                usePassword: _usePassword,
                onChanged: (v) => setState(() {
                  _usePassword = v;
                  _error = null;
                }),
              ),
              const SizedBox(height: AppSpacing.md),
              BlinkError(
                trigger: _tick,
                child: TextFormField(
                  forceErrorText: (_usePassword && _isPwErr(_error))
                      ? null
                      : _error,
                  controller: _identifier,
                  keyboardType: TextInputType.emailAddress,
                  inputFormatters: const [PhoneOrEmailFormatter()],
                  decoration: const InputDecoration(
                    labelText: 'Mobile number or email',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: Validators.phoneOrEmail,
                ),
              ),
              if (_usePassword) ...[
                const SizedBox(height: AppSpacing.md),
                BlinkError(
                  trigger: _tick,
                  child: TextFormField(
                    forceErrorText: (_usePassword && _isPwErr(_error))
                        ? _error
                        : null,
                    controller: _password,
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
                    validator: (v) => Validators.required(v, label: 'Password'),
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: _usePassword ? 'Log in' : 'Send code',
                loading: _busy,
                expand: true,
                onPressed: _busy ? null : _submit,
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: () => context.push(RoutePaths.ownerStart),
                child: const Text('New here? List your property'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
