/// Compile-time brand name for this flavor's build, set per flavor via
/// `--dart-define=APP_BRAND_NAME=Pronesto --dart-define=APP_BRAND_SPLIT=3`
/// (see the flutter build command for each flavor). Defaults to BayaEstate
/// for a plain `flutter run` with no dart-defines.
class AppBrand {
  AppBrand._();

  static const String name = String.fromEnvironment(
    'APP_BRAND_NAME',
    defaultValue: 'BayaEstate',
  );

  /// Character count of the wordmark's first (non-italic) half, e.g. 4 for
  /// "Baya" + "Estate" or 3 for "Pro" + "nesto".
  static const int splitAt = int.fromEnvironment(
    'APP_BRAND_SPLIT',
    defaultValue: 4,
  );

  static String get wordmarkPrefix => name.substring(0, splitAt.clamp(0, name.length));
  static String get wordmarkSuffix => name.substring(splitAt.clamp(0, name.length));

  /// Splash screen's 3-segment uppercase wordmark (ink / gold-highlight /
  /// ink), e.g. "BAY" + "AE" + "STATE" or "PRO" + "NEST" + "O". Character
  /// offsets into the uppercased name, set via `--dart-define=APP_SPLASH_SPLIT1=n`
  /// and `=APP_SPLASH_SPLIT2=n`.
  static const int splashSplit1 = int.fromEnvironment('APP_SPLASH_SPLIT1', defaultValue: 3);
  static const int splashSplit2 = int.fromEnvironment('APP_SPLASH_SPLIT2', defaultValue: 5);

  static String get splashSegment1 =>
      name.toUpperCase().substring(0, splashSplit1.clamp(0, name.length));
  static String get splashSegment2 => name
      .toUpperCase()
      .substring(splashSplit1.clamp(0, name.length), splashSplit2.clamp(0, name.length));
  static String get splashSegment3 =>
      name.toUpperCase().substring(splashSplit2.clamp(0, name.length));
}
