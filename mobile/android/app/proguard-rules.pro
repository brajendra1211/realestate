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
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
