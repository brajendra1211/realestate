import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/config/app_brand.dart';
import 'core/network/api_client.dart';
import 'core/notifications/push_notifications.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'providers/agent_auth_provider.dart';
import 'providers/customer_auth_provider.dart';
import 'services/auth_service.dart';

class BayaEstateApp extends StatefulWidget {
  const BayaEstateApp({super.key});

  @override
  State<BayaEstateApp> createState() => _BayaEstateAppState();
}

class _BayaEstateAppState extends State<BayaEstateApp> {
  late final AuthService _authService;
  late final AgentAuthProvider _agentAuth;
  late final CustomerAuthProvider _customerAuth;
  late final GoRouter _router;
  StreamSubscription<Map<String, String>>? _ringTapSubscription;

  @override
  void initState() {
    super.initState();
    _authService = AuthService(ApiClient.instance.dio);
    _agentAuth = AgentAuthProvider(_authService);
    _customerAuth = CustomerAuthProvider(_authService);
    _router = buildAppRouter(_agentAuth, _customerAuth);

    // Kept alive for the app's whole lifetime (unlike the splash screen's
    // one-shot cold-start check) — jumps straight to the incoming-ring
    // screen whenever a "property-ring" notification is tapped, or its
    // full-screen intent auto-launches, while the app is already alive.
    _ringTapSubscription = ringTapped.stream.listen((data) {
      _router.go(incomingRingLocation(data));
    });
  }

  @override
  void dispose() {
    _ringTapSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AuthService>.value(value: _authService),
        ChangeNotifierProvider<AgentAuthProvider>.value(value: _agentAuth),
        ChangeNotifierProvider<CustomerAuthProvider>.value(value: _customerAuth),
      ],
      child: MaterialApp.router(
        title: AppBrand.name,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        routerConfig: _router,
      ),
    );
  }
}
