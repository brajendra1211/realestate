/// Hand-rolled form validators — small enough at this scale that a form
/// helper package isn't warranted.
class Validators {
  Validators._();

  static String? required(String? value, {String label = 'This field'}) {
    if (value == null || value.trim().isEmpty) return '$label is required';
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) return 'Email is required';
    final regex = RegExp(r'^[\w\.\-]+@[\w\-]+\.[a-zA-Z]{2,}$');
    if (!regex.hasMatch(value.trim())) return 'Enter a valid email';
    return null;
  }

  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) return 'Phone is required';
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 10) return 'Enter a valid phone number';
    return null;
  }

  /// For OTP-login identifier fields (buyer/investor/channel partner) that
  /// accept either — validates inline instead of letting a malformed value
  /// through to a vague "couldn't send the code" failure from the server.
  static String? phoneOrEmail(String? value) {
    if (value == null || value.trim().isEmpty) return 'Phone or email is required';
    final trimmed = value.trim();
    if (trimmed.contains('@')) return email(trimmed);

    final digits = trimmed.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 10) return 'Enter a valid 10-digit phone number';
    return null;
  }

  /// Indian mobile: exactly 10 digits, starting 6-9 (same rule as the server).
  static String? mobile10(String? value) {
    final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return 'Mobile number is required';
    if (digits.length != 10) return 'Enter exactly 10 digits';
    if (!RegExp(r'^[6-9]').hasMatch(digits)) return 'Mobile number must start with 6, 7, 8 or 9';
    return null;
  }

  /// Optional 10-digit mobile.
  static String? optionalMobile10(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    return mobile10(value);
  }

  /// Letters, spaces and . ' - only (same rule as the server).
  static String? personName(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Name is required';
    if (!RegExp(r"^[A-Za-z][A-Za-z .'-]*$").hasMatch(v)) return 'Name can only contain letters (A-Z)';
    return null;
  }

  static String? password(String? value, {int minLength = 8}) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < minLength) {
      return 'Password must be at least $minLength characters';
    }
    return null;
  }
}
