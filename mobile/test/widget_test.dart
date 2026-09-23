import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'package:bayaestate_app/core/theme/app_theme.dart';
import 'package:bayaestate_app/features/splash/splash_screen.dart';
import 'package:bayaestate_app/providers/agent_auth_provider.dart';
import 'package:bayaestate_app/services/auth_service.dart';

void main() {
  testWidgets('Splash screen shows the app name then routes home',
      (WidgetTester tester) async {
    final agentAuth = AgentAuthProvider(AuthService(Dio()));
    final router = GoRouter(
      initialLocation: '/splash',
      routes: [
        GoRoute(
          path: '/splash',
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: '/',
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('Home'))),
        ),
      ],
    );

    await tester.pumpWidget(
      ChangeNotifierProvider<AgentAuthProvider>.value(
        value: agentAuth,
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: router,
        ),
      ),
    );

    expect(find.text('BayaEstate'), findsOneWidget);

    // Flush the splash screen's bootstrap timer (session check + minimum
    // splash delay) and let it navigate to home.
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();

    expect(find.text('Home'), findsOneWidget);
  });
}
