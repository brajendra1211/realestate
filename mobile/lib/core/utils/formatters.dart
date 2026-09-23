import 'package:intl/intl.dart';

/// Shared display formatters. Backend money fields are plain rupee
/// integers (not paise).
class Formatters {
  Formatters._();

  static final NumberFormat _inr = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  static String price(num amount, {bool perMonth = false}) {
    final formatted = _inr.format(amount);
    return perMonth ? '$formatted/mo' : formatted;
  }
}
