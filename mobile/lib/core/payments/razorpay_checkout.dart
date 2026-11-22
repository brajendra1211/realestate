import 'dart:async';

import 'package:razorpay_flutter/razorpay_flutter.dart';

class RazorpayResult {
  const RazorpayResult({required this.orderId, required this.paymentId, required this.signature});
  final String orderId;
  final String paymentId;
  final String signature;
}

/// Opens the real Razorpay checkout and completes with the signed payment, or
/// null if the user closed it. Throws a [String] message on a payment failure.
Future<RazorpayResult?> openRazorpayCheckout({
  required String keyId,
  required String orderId,
  required int amountPaise,
  required String description,
  String? name,
  String? phone,
  String? email,
}) {
  final completer = Completer<RazorpayResult?>();
  final razorpay = Razorpay();

  void finish(RazorpayResult? value, [Object? error]) {
    if (completer.isCompleted) return;
    razorpay.clear();
    if (error != null) {
      completer.completeError(error);
    } else {
      completer.complete(value);
    }
  }

  razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse r) {
    finish(RazorpayResult(
      orderId: r.orderId ?? orderId,
      paymentId: r.paymentId ?? '',
      signature: r.signature ?? '',
    ));
  });
  razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse r) {
    // The user closed the checkout.
    if (r.code == Razorpay.PAYMENT_CANCELLED) {
      finish(null);
    } else {
      finish(null, r.message ?? 'Payment failed. Please try again.');
    }
  });
  razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (ExternalWalletResponse r) {});

  razorpay.open({
    'key': keyId,
    'order_id': orderId,
    'amount': amountPaise,
    'currency': 'INR',
    'name': 'Pronesto',
    'description': description,
    'prefill': {
      'name': ?name,
      'contact': ?phone,
      'email': ?email,
    },
    'theme': {'color': '#1A4AD8'},
  });
  return completer.future;
}
