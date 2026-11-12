# firebase_messaging's background message handler looks up the registered
# Dart callback reflectively (FlutterCallbackInformation.lookupCallbackInformation)
# and spins up its own background FlutterEngine to run it — without these,
# R8 (active by default on release builds here, confirmed by the obfuscated
# res/* paths in a built release APK) strips/renames the classes that
# reflection depends on, so the handler silently never fires. Root cause of
# "ring never arrives in release builds, but works fine via flutter run
# --debug" — the data message itself was always delivered and accepted by
# FCM; it just had nothing intact to invoke it with.
-keep class io.flutter.plugins.firebase.messaging.** { *; }
-keep class io.flutter.embedding.engine.FlutterEngine { *; }
-keep class io.flutter.view.FlutterCallbackInformation { *; }
-keep class io.flutter.plugin.common.** { *; }
-keep class io.flutter.embedding.** { *; }
-keep class io.flutter.plugins.** { *; }

# Flutter's embedding defensively references Play Feature Delivery's
# "deferred components" classes (FlutterPlayStoreSplitApplication etc.) for
# apps using dynamic feature modules — this one doesn't, so
# com.google.android.play.core.* isn't a dependency at all. Keeping the
# broader io.flutter.embedding.** rule above pulls those references back in
# for R8 to resolve, which then fails the build since the classes
# genuinely don't exist; this tells it that's expected or on purpose.
-dontwarn com.google.android.play.core.**

# The class names above survive R8 fine (confirmed directly against
# build/app/outputs/mapping/pronestoRelease/mapping.txt), yet the ring
# still silently never arrives in a release build even in the foreground
# (FlutterFirebaseMessagingReceiver -> FlutterFirebaseRemoteMessageLiveData
# -> the plugin's EventChannel to Dart's onMessage). The remaining suspect
# is R8 stripping these *attributes* by default — generic signatures,
# annotations, and inner-class/enclosing-method metadata that Firebase's
# internal component wiring and Gson (used by flutter_local_notifications
# for persisting scheduled notifications) depend on reflectively even when
# the class/method *names* it looks up are intact.
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes SourceFile,LineNumberTable

# Firebase's component discovery (how it finds FirebaseMessaging's own
# registrar at runtime) is itself reflection-based.
-keep class com.google.firebase.components.** { *; }
-keep class * extends com.google.firebase.components.ComponentRegistrar

# flutter_local_notifications persists scheduled-notification state via
# Gson; without -keepattributes Signature (above) its generic type
# adapters silently fail to deserialize.
-keep class com.dexterous.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
