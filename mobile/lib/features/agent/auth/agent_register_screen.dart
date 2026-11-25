import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/auth_header.dart';
import '../../../core/widgets/form_section.dart';
import '../../../core/utils/input_formats.dart';
import '../../../services/agent_service.dart';
import '../../../services/otp_service.dart';

class AgentRegisterScreen extends StatefulWidget {
  const AgentRegisterScreen({super.key});

  @override
  State<AgentRegisterScreen> createState() => _AgentRegisterScreenState();
}

class _AgentRegisterScreenState extends State<AgentRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  late final AgentService _service;

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _alternatePhone = TextEditingController();
  final _otp = TextEditingController();
  final _password = TextEditingController();
  final _shopName = TextEditingController();
  final _shopAddress = TextEditingController();
  final _city = TextEditingController();
  final _yearsExperience = TextEditingController();
  final _staffCount = TextEditingController();
  final _reraNumber = TextEditingController();
  final _gstNumber = TextEditingController();
  final _referredByAgentCode = TextEditingController();

  bool _submitting = false;
  bool _obscurePassword = true;
  bool _otpSent = false;
  bool _otpBusy = false;
  bool _verifying = false;
  bool _verified = false;
  String? _proof;
  final _cooldown = OtpCooldown();
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _service = AgentService(ApiClient.instance.dio);
  }

  @override
  void dispose() {
    _ticker?.cancel();
    for (final c in [
      _name,
      _email,
      _phone,
      _alternatePhone,
      _otp,
      _password,
      _shopName,
      _shopAddress,
      _city,
      _yearsExperience,
      _staffCount,
      _reraNumber,
      _gstNumber,
      _referredByAgentCode,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final bad = Validators.mobile10(_phone.text);
    if (bad != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(bad)));
      return;
    }
    if (_cooldown.active || _verified) return;
    setState(() { _otpBusy = true; });
    try {
      await _service.sendRegistrationOtp(_phone.text.trim());
      if (!mounted) return;
      _cooldown.start();
      _ticker?.cancel();
      _ticker = Timer.periodic(const Duration(seconds: 1), (t) {
        if (!mounted) return t.cancel();
        setState(() {});
        if (!_cooldown.active) t.cancel();
      });
      setState(() { _otpSent = true; });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('OTP sent on WhatsApp to ${_phone.text.trim()}.')));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() { _otpBusy = false; });
    }
  }

  Future<void> _verifyOtp() async {
    final code = _otp.text.trim();
    if (code.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter the 6-digit OTP.')));
      return;
    }
    setState(() { _verifying = true; });
    try {
      final proof = await OtpService(ApiClient.instance.dio).verifyPhone(_phone.text.trim(), code);
      if (!mounted) return;
      setState(() {
        _verified = true;
        _proof = proof;
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Mobile number verified.')));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() { _verifying = false; });
    }
  }

  Future<void> _submit() async {
    if (!_verified) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verify your mobile number with the OTP first.')));
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    setState(() { _submitting = true; });
    try {
      final result = await _service.register(
        name: _name.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        phone: _phone.text.trim(),
        phoneProof: _proof,
        alternatePhone:
            _alternatePhone.text.trim().isEmpty ? null : _alternatePhone.text.trim(),
        shopName: _shopName.text.trim(),
        shopAddress: _shopAddress.text.trim(),
        city: _city.text.trim(),
        yearsExperience: int.tryParse(_yearsExperience.text.trim()),
        staffCount: int.tryParse(_staffCount.text.trim()),
        reraNumber: _reraNumber.text.trim().isEmpty ? null : _reraNumber.text.trim(),
        gstNumber: _gstNumber.text.trim().isEmpty ? null : _gstNumber.text.trim(),
        referredByAgentCode: _referredByAgentCode.text.trim().isEmpty
            ? null
            : _referredByAgentCode.text.trim(),
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Application submitted'),
          content: Text(
            'Your channel partner account is ${result.status.toLowerCase()}. '
            'You can log in now — full channel partner features unlock once an admin approves your application.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      if (!mounted) return;
      context.go(RoutePaths.agentLogin);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() { _submitting = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Become a Channel Partner')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              const AuthHeader(
                title: 'Join as a channel partner',
                subtitle:
                    'Tell us about you and your shop — we review every application.',
              ),
              const SizedBox(height: AppSpacing.xl),
              FormSection(
                title: 'Your details',
                stepNumber: 1,
                children: [
                  TextFormField(
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r"[A-Za-z .'-]"))],
                    decoration: const InputDecoration(
                      labelText: 'Full name',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    validator: Validators.personName,
                  ),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                    validator: Validators.email,
                  ),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.number,
                    inputFormatters: phoneFormatters,
                    readOnly: _verified,
                    onChanged: (_) {
                      if (_otpSent || _verified) {
                        setState(() {
                          _otpSent = false;
                          _verified = false;
                          _proof = null;
                          _otp.clear();
                        });
                      }
                    },
                    decoration: const InputDecoration(
                      labelText: 'Mobile number (WhatsApp)',
                      hintText: '10 digits',
                      helperText: 'One mobile number can only be used for one account.',
                      prefixIcon: Icon(Icons.call_outlined),
                      counterText: '',
                    ),
                    validator: Validators.mobile10,
                  ),
                  if (_verified)
                    const Row(children: [
                      Icon(Icons.verified, color: Colors.green, size: 18),
                      SizedBox(width: 6),
                      Text('Mobile number verified', style: TextStyle(color: Colors.green, fontWeight: FontWeight.w700)),
                    ])
                  else ...[
                    Align(
                      alignment: Alignment.centerLeft,
                      child: AppButton(
                        label: _cooldown.active
                            ? 'Resend OTP in ${_cooldown.left}s'
                            : (_otpSent ? 'Resend WhatsApp OTP' : 'Send WhatsApp OTP'),
                        icon: Icons.chat_outlined,
                        variant: AppButtonVariant.secondary,
                        loading: _otpBusy,
                        onPressed: (_otpBusy || _cooldown.active) ? null : _sendOtp,
                      ),
                    ),
                    if (_otpSent)
                      Text('OTP sent on WhatsApp to ${_phone.text.trim()}. Enter it below and tap Verify.',
                          style: Theme.of(context).textTheme.bodySmall),
                    TextFormField(
                      controller: _otp,
                      keyboardType: TextInputType.number,
                      inputFormatters: otpFormatters,
                      decoration: InputDecoration(
                        labelText: 'WhatsApp OTP',
                        hintText: _otpSent ? '6-digit OTP' : 'Send the OTP first',
                        prefixIcon: const Icon(Icons.sms_outlined),
                        counterText: '',
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: AppButton(
                        label: 'Verify OTP',
                        icon: Icons.check_circle_outline,
                        loading: _verifying,
                        onPressed: (!_otpSent || _verifying) ? null : _verifyOtp,
                      ),
                    ),
                  ],
                  TextFormField(
                    controller: _alternatePhone,
                    keyboardType: TextInputType.number,
                    inputFormatters: phoneFormatters,
                    decoration: const InputDecoration(labelText: 'Alternate mobile (optional)', counterText: ''),
                    validator: Validators.optionalMobile10,
                  ),
                  TextFormField(
                    controller: _password,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined),
                        onPressed: () =>
                            setState(() { _obscurePassword = !_obscurePassword; }),
                      ),
                    ),
                    validator: Validators.password,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              if (!_verified)
                const Text(
                  'Verify your mobile number to continue with your shop details.',
                  style: TextStyle(fontWeight: FontWeight.w600),
                )
              else ...[
              FormSection(
                title: 'Shop details',
                stepNumber: 2,
                children: [
                  TextFormField(
                    controller: _shopName,
                    decoration: const InputDecoration(
                      labelText: 'Shop / business name',
                      prefixIcon: Icon(Icons.storefront_outlined),
                    ),
                    validator: (v) => Validators.required(v, label: 'Shop name'),
                  ),
                  TextFormField(
                    controller: _shopAddress,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Shop address'),
                    validator: (v) => Validators.required(v, label: 'Shop address'),
                  ),
                  TextFormField(
                    controller: _city,
                    decoration: const InputDecoration(
                      labelText: 'City',
                      prefixIcon: Icon(Icons.location_city_outlined),
                    ),
                    validator: (v) => Validators.required(v, label: 'City'),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _yearsExperience,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Years of experience'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: TextFormField(
                          controller: _staffCount,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Staff count'),
                        ),
                      ),
                    ],
                  ),
                  TextFormField(
                    controller: _reraNumber,
                    decoration: const InputDecoration(labelText: 'RERA number (optional)'),
                  ),
                  TextFormField(
                    controller: _gstNumber,
                    decoration: const InputDecoration(labelText: 'GST number (optional)'),
                  ),
                  TextFormField(
                    controller: _referredByAgentCode,
                    decoration:
                        const InputDecoration(labelText: 'Referral channel partner code (optional)'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                label: 'Submit application',
                expand: true,
                loading: _submitting,
                onPressed: _submit,
              ),
              ],
              const SizedBox(height: AppSpacing.md),
              Center(
                child: TextButton(
                  onPressed: () => context.go(RoutePaths.agentLogin),
                  child: const Text('Already a channel partner? Log in'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
