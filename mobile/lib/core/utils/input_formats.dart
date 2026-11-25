import 'package:flutter/services.dart';

/// Mobile number fields: digits only, at most 10 of them.
final List<TextInputFormatter> phoneFormatters = [
  FilteringTextInputFormatter.digitsOnly,
  LengthLimitingTextInputFormatter(10),
];

/// OTP fields: digits only, at most 6.
final List<TextInputFormatter> otpFormatters = [
  FilteringTextInputFormatter.digitsOnly,
  LengthLimitingTextInputFormatter(6),
];

/// Login fields that take a phone number OR an email. While the text looks like a phone number
/// (no letters, no @) it stops at 10 digits; a pasted "+91…" / "91…" number may be 12 digits.
class PhoneOrEmailFormatter extends TextInputFormatter {
  const PhoneOrEmailFormatter();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text;
    if (RegExp(r'[A-Za-z@]').hasMatch(text)) return newValue; // an email
    final digits = text.replaceAll(RegExp(r'\D'), '');
    final prefixed = text.trimLeft().startsWith('+91') || digits.startsWith('91');
    final limit = prefixed && digits.length > 10 ? 12 : 10;
    if (digits.length > limit) return oldValue;
    return newValue;
  }
}

/// Counts down an OTP resend window. Call [start] after a successful send.
class OtpCooldown {
  OtpCooldown({this.seconds = 60});
  final int seconds;
  DateTime? _until;

  void start() => _until = DateTime.now().add(Duration(seconds: seconds));
  void reset() => _until = null;

  int get left {
    final u = _until;
    if (u == null) return 0;
    final s = u.difference(DateTime.now()).inSeconds + 1;
    return s < 0 ? 0 : (s > seconds ? seconds : s);
  }

  bool get active => left > 0;
}
