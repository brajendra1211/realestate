import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/network/api_client.dart';
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

  @override
  void initState() {
    super.initState();
    _authService = AuthService(ApiClient.instance.dio);
    _agentAuth = AgentAuthProvider(_authService);
    _customerAuth = CustomerAuthProvider(_authService);
    _router = buildAppRouter(_agentAuth, _customerAuth);
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
        title: 'BayaEstate',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        routerConfig: _router,
      ),
    );
  }
}
