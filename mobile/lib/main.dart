import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import 'app.dart';
import 'core/network/api_client.dart';
import 'core/notifications/push_notifications.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Test runs (adb/uiautomator) read labels from the accessibility tree.
  if (const bool.fromEnvironment('EXPOSE_SEMANTICS')) SemanticsBinding.instance.ensureSemantics();
  await Firebase.initializeApp();
  await PushNotifications.init();
  await ApiClient.instance.init();
  runApp(const BayaEstateApp());
}
