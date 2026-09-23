import '../network/api_exception.dart';

/// Maps a backend error code to a human-readable message. Falls back to a
/// generic message for codes not explicitly mapped.
String errorMessageFor(ApiException e) {
  switch (e.code) {
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'network_error':
      return 'Could not reach the server. Check your connection and try again.';
    case 'Unauthorized':
      return 'Please log in to continue.';
    case 'validation':
      return 'Please check your name, email, and password (min 8 characters).';
    case 'shopDetails':
      return 'Please fill in your shop name, address, and city.';
    case 'duplicate':
      return 'An account with this email already exists.';
    case 'referrerNotFound':
      return 'Referral agent code not found.';
    case 'notFound':
      return 'Not found.';
    case 'noLocation':
      return "We couldn't locate that address — please check the city and address.";
    case 'payment_unavailable':
      return "Online payment isn't available yet. Please contact support to finish this listing.";
    case 'send':
      return "We couldn't send the code right now. Please try again in a moment.";
    case 'invalidSignature':
      return 'Payment verification failed. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
