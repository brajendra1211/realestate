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
    case 'invalidPhone':
      return 'Enter a valid 10-digit mobile number (starting with 6, 7, 8 or 9).';
    case 'phoneInUse':
      return 'This mobile number is already registered with another account.';
    case 'invalidName':
      return 'Name can only contain letters (A-Z).';
    case 'underAge':
      return 'You must be at least 18 years old to register.';
    case 'dobRequired':
      return 'Please enter your date of birth.';
    case 'invalidBankName':
      return 'Account holder name can only contain letters (A-Z).';
    case 'invalidAccountNumber':
      return 'Bank account number must be digits only (9 to 18 digits).';
    case 'otpInvalid':
      return 'The WhatsApp OTP is not correct or has expired. Please request a new one.';
    case 'otpSendFailed':
      return "We couldn't send the OTP right now. Please try again in a minute.";
    case 'duplicate':
      return 'An account with this email already exists.';
    case 'referrerNotFound':
      return 'Referral channel partner code not found.';
    case 'notFound':
      return 'Not found.';
    case 'geocode':
      return "We couldn't locate that address on the map. Add the sector/area and city name and try again.";
    case 'noLocation':
      return "We couldn't locate that address — please check the city and address.";
    case 'payment_unavailable':
      return "Online payment isn't available yet. Please contact support to finish this listing.";
    case 'send':
      return "We couldn't send the code right now. Please try again in a moment.";
    case 'invalidSignature':
      return 'Payment verification failed. Please try again.';
    case 'dailyLimitReached':
      return "You've reached today's ring limit for this property. Try again tomorrow.";
    case 'noChannelPartner':
      return 'No channel partner is attached to this property yet.';
    case 'notSaved':
      return 'Save or unlock this property first, then you can ring its channel partner.';
    default:
      // The server sends readable sentences for role/OTP-wait conflicts: show them as they are.
      if (e.code.contains(' ') && e.code.length > 12) return e.code;
      return 'Something went wrong. Please try again.';
  }
}
