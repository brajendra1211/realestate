import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/account_screen.dart';
import '../../features/agent/appointments/agent_appointments_screen.dart';
import '../../features/agent/auth/agent_forgot_password_screen.dart';
import '../../features/agent/auth/agent_login_screen.dart';
import '../../features/agent/auth/agent_register_screen.dart';
import '../../features/agent/auth/agent_verify_screen.dart';
import '../../features/agent/broadcast/agent_broadcast_list_screen.dart';
import '../../features/agent/commissions/agent_commissions_screen.dart';
import '../../features/agent/cycle/agent_cycle_screen.dart';
import '../../features/agent/deals/agent_deals_list_screen.dart';
import '../../features/agent/dashboard/agent_dashboard_screen.dart';
import '../../features/agent/digest/agent_digest_screen.dart';
import '../../features/agent/office_visits/agent_office_visits_screen.dart';
import '../../features/agent/requirements/agent_requirements_screen.dart';
import '../../features/buyer/cart/buyer_cart_screen.dart';
import '../../features/agent/dispatch/agent_dispatch_list_screen.dart';
import '../../features/agent/documents/agent_documents_screen.dart';
import '../../features/agent/gold_listings/agent_gold_listings_screen.dart';
import '../../features/agent/investors/agent_investors_screen.dart';
import '../../features/agent/listings/agent_listing_form_screen.dart';
import '../../features/agent/listings/agent_listings_screen.dart';
import '../../features/agent/payouts/agent_payouts_screen.dart';
import '../../features/agent/profile/agent_profile_screen.dart';
import '../../features/agent/qr/agent_my_qr_screen.dart';
import '../../features/agent/ratings/agent_ratings_screen.dart';
import '../../features/agent/ring/incoming_ring_screen.dart';
import '../../features/agent/shell/agent_shell.dart';
import '../../features/agent/subscription/agent_subscription_screen.dart';
import '../../features/agent/settings/agent_settings_screen.dart';
import '../../features/agent/visits/agent_visits_screen.dart';
import '../../features/buyer/auth/buyer_login_screen.dart';
import '../../features/buyer/auth/buyer_verify_screen.dart';
import '../../features/buyer/dashboard/buyer_dashboard_screen.dart';
import '../../features/buyer/direct_visit/direct_visit_screen.dart';
import '../../features/buyer/dispatch/dispatch_request_screen.dart';
import '../../features/buyer/gold_listing/gold_listing_screen.dart';
import '../../features/buyer/payments/buyer_payments_screen.dart';
import '../../features/consumer/home/home_screen.dart';
import '../../features/consumer/leaderboard/leaderboard_screen.dart';
import '../../features/consumer/listing_detail/listing_detail_screen.dart';
import '../../features/consumer/qr_scanner/agent_qr_scanner_screen.dart';
import '../../features/consumer/agent_shop/agent_shop_screen.dart';
import '../../features/consumer/rating/rate_agent_screen.dart';
import '../../features/consumer/search/search_screen.dart';
import '../../features/consumer/shell/consumer_shell.dart';
import '../../features/investor/auth/investor_login_screen.dart';
import '../../features/investor/auth/investor_verify_screen.dart';
import '../../features/investor/dashboard/investor_dashboard_screen.dart';
import '../../features/investor/documents/investor_documents_screen.dart';
import '../../features/agent/brochures/agent_brochures_screen.dart';
import '../../features/agent/buyer_leads/agent_buyer_leads_screen.dart';
import '../../features/agent/owner_requests/agent_owner_requests_screen.dart';
import '../../features/owner/owner_details_screen.dart';
import '../../features/support/support_screen.dart';
import '../../features/owner/owner_login_screen.dart';
import '../../features/owner/owner_start_screen.dart';
import '../../features/owner/owner_status_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../providers/agent_auth_provider.dart';
import '../../providers/customer_auth_provider.dart';
import 'route_paths.dart';

/// Routes needing an authenticated agent session. Anything under
/// `/agent/*` except login/register is gated here.
const _agentAuthRequiredPrefixes = [
  RoutePaths.agentDashboard,
  RoutePaths.agentProfile,
  RoutePaths.agentListings,
  RoutePaths.agentCommissions,
  RoutePaths.agentInvestors,
  RoutePaths.agentDocuments,
  RoutePaths.agentDispatch,
  RoutePaths.agentAppointments,
  RoutePaths.agentBroadcast,
  RoutePaths.agentVisits,
  RoutePaths.agentSettings,
  RoutePaths.agentPayouts,
  RoutePaths.agentRatings,
  RoutePaths.agentDigest,
  RoutePaths.agentOfficeVisits,
  RoutePaths.agentRequirements,
  RoutePaths.agentGoldListings,
  RoutePaths.agentMore,
  RoutePaths.agentSubscription,
  RoutePaths.agentCycle,
  RoutePaths.agentDeals,
  RoutePaths.agentShopQr,
  RoutePaths.incomingRing,
  RoutePaths.agentOwnerRequests,
  RoutePaths.agentBuyerLeads,
  RoutePaths.agentBrochures,
];

/// Routes needing an authenticated buyer session, gated the same way as
/// [_agentAuthRequiredPrefixes].
const _buyerAuthRequiredPrefixes = [
  RoutePaths.buyerDashboard,
  RoutePaths.buyerDirectVisit,
  RoutePaths.buyerGoldListing,
  RoutePaths.buyerDispatch,
  RoutePaths.buyerCart,
  RoutePaths.buyerPayments,
];

GoRouter buildAppRouter(AgentAuthProvider agentAuth, CustomerAuthProvider customerAuth) {
  return GoRouter(
    initialLocation: RoutePaths.splash,
    refreshListenable: Listenable.merge([agentAuth, customerAuth]),
    redirect: (context, state) {
      final location = state.uri.toString();

      final needsAgentAuth =
          _agentAuthRequiredPrefixes.any((prefix) => location.startsWith(prefix));
      if (needsAgentAuth && !agentAuth.isLoggedIn) {
        return '${RoutePaths.agentLogin}?from=$location';
      }

      final needsBuyerAuth =
          _buyerAuthRequiredPrefixes.any((prefix) => location.startsWith(prefix));
      if (needsBuyerAuth && !customerAuth.isBuyer) {
        return '${RoutePaths.buyerLogin}?from=$location';
      }
      if (location.startsWith(RoutePaths.ownerStatus) && !customerAuth.isOwner) {
        return RoutePaths.ownerLogin;
      }
      if ((location.startsWith(RoutePaths.investorDashboard) ||
              location.startsWith(RoutePaths.investorDocuments)) &&
          !customerAuth.isInvestor) {
        return RoutePaths.investorLogin;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: RoutePaths.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RoutePaths.account,
        builder: (context, state) => const AccountScreen(),
      ),
      GoRoute(
        path: RoutePaths.buyerLogin,
        builder: (context, state) => const BuyerLoginScreen(),
      ),
      GoRoute(
        path: RoutePaths.buyerVerify,
        builder: (context, state) => BuyerVerifyScreen(
          identifier: state.uri.queryParameters['identifier'] ?? '',
          channel: state.uri.queryParameters['channel'] ?? 'EMAIL',
          from: state.uri.queryParameters['from'],
          panel: state.uri.queryParameters['panel'] ?? 'buyer',
        ),
      ),
      GoRoute(
        path: RoutePaths.buyerCart,
        builder: (context, state) => const BuyerCartScreen(),
      ),
      GoRoute(
        path: RoutePaths.buyerPayments,
        builder: (context, state) => const BuyerPaymentsScreen(),
      ),
      GoRoute(
        path: RoutePaths.buyerDashboard,
        builder: (context, state) => const BuyerDashboardScreen(),
      ),
      GoRoute(
        path: RoutePaths.buyerDirectVisit,
        builder: (context, state) => DirectVisitScreen(
          agentListingId: state.uri.queryParameters['agentListingId'] ?? '',
          propertyTitle: state.uri.queryParameters['title'],
        ),
      ),
      GoRoute(path: RoutePaths.support, builder: (context, state) => const SupportScreen()),
      GoRoute(path: RoutePaths.ownerStart, builder: (context, state) => const OwnerStartScreen()),
      GoRoute(path: RoutePaths.ownerLogin, builder: (context, state) => const OwnerLoginScreen()),
      GoRoute(path: RoutePaths.ownerStatus, builder: (context, state) => const OwnerStatusScreen()),
      GoRoute(
        path: RoutePaths.ownerDetails,
        builder: (context, state) => OwnerDetailsScreen(token: state.pathParameters['token'] ?? ''),
      ),
      GoRoute(
        path: RoutePaths.buyerGoldListing,
        builder: (context, state) => const GoldListingScreen(),
      ),
      GoRoute(
        path: RoutePaths.buyerDispatch,
        builder: (context, state) => const DispatchRequestScreen(),
      ),
      GoRoute(
        path: RoutePaths.investorLogin,
        builder: (context, state) => const InvestorLoginScreen(),
      ),
      GoRoute(
        path: RoutePaths.investorVerify,
        builder: (context, state) => InvestorVerifyScreen(
          identifier: state.uri.queryParameters['identifier'] ?? '',
          channel: state.uri.queryParameters['channel'] ?? 'EMAIL',
        ),
      ),
      GoRoute(
        path: RoutePaths.investorDashboard,
        builder: (context, state) => const InvestorDashboardScreen(),
      ),
      GoRoute(
        path: RoutePaths.investorDocuments,
        builder: (context, state) => const InvestorDocumentsScreen(),
      ),
      GoRoute(
        path: RoutePaths.agentLogin,
        builder: (context, state) => const AgentLoginScreen(),
      ),
      GoRoute(
        path: RoutePaths.agentForgotPassword,
        builder: (context, state) => const AgentForgotPasswordScreen(),
      ),
      GoRoute(
        path: RoutePaths.agentVerify,
        builder: (context, state) => AgentVerifyScreen(
          identifier: state.uri.queryParameters['identifier'] ?? '',
          channel: state.uri.queryParameters['channel'] ?? 'EMAIL',
          from: state.uri.queryParameters['from'],
        ),
      ),
      GoRoute(
        path: RoutePaths.agentRegister,
        builder: (context, state) => const AgentRegisterScreen(),
      ),
      GoRoute(
        path: RoutePaths.agentListingNew,
        builder: (context, state) => const AgentListingFormScreen(),
      ),
      GoRoute(
        path: RoutePaths.incomingRing,
        builder: (context, state) => IncomingRingScreen(
          propertyTitle: state.uri.queryParameters['propertyTitle'] ?? '',
          buyerName: state.uri.queryParameters['buyerName'] ?? '',
          buyerPhone: state.uri.queryParameters['buyerPhone'] ?? '',
          propertyWhere: state.uri.queryParameters['propertyWhere'] ?? '',
          propertyPrice: state.uri.queryParameters['propertyPrice'] ?? '',
          propertyKind: state.uri.queryParameters['propertyKind'] ?? '',
          listedBy: state.uri.queryParameters['listedBy'] ?? '',
        ),
      ),
      GoRoute(
        path: RoutePaths.listingDetail,
        builder: (context, state) => ListingDetailScreen(
          slug: state.pathParameters['slug']!,
        ),
      ),
      GoRoute(
        path: RoutePaths.rateAgent,
        builder: (context, state) => RateAgentScreen(
          agentCode: state.pathParameters['agentCode']!,
        ),
      ),
      GoRoute(
        path: RoutePaths.qrScanner,
        builder: (context, state) => const AgentQrScannerScreen(),
      ),
      GoRoute(
        path: RoutePaths.agentShop,
        builder: (context, state) => AgentShopScreen(
          agentCode: state.pathParameters['agentCode']!,
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => ConsumerShell(child: child),
        routes: [
          GoRoute(
            path: RoutePaths.home,
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: RoutePaths.search,
            builder: (context, state) => const SearchScreen(),
          ),
          GoRoute(
            path: RoutePaths.leaderboard,
            builder: (context, state) => const LeaderboardScreen(),
          ),
        ],
      ),
      ShellRoute(
        builder: (context, state, child) => AgentShell(child: child),
        routes: [
          GoRoute(
            path: RoutePaths.agentDashboard,
            builder: (context, state) => const AgentDashboardScreen(),
          ),
          GoRoute(path: RoutePaths.agentOwnerRequests, builder: (context, state) => const AgentOwnerRequestsScreen()),
          GoRoute(path: RoutePaths.agentBuyerLeads, builder: (context, state) => const AgentBuyerLeadsScreen()),
          GoRoute(path: RoutePaths.agentBrochures, builder: (context, state) => const AgentBrochuresScreen()),
          GoRoute(
            path: RoutePaths.agentListings,
            builder: (context, state) => const AgentListingsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentDispatch,
            builder: (context, state) => const AgentDispatchListScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentProfile,
            builder: (context, state) => const AgentProfileScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentCommissions,
            builder: (context, state) => const AgentCommissionsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentInvestors,
            builder: (context, state) => const AgentInvestorsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentDocuments,
            builder: (context, state) => const AgentDocumentsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentAppointments,
            builder: (context, state) => const AgentAppointmentsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentBroadcast,
            builder: (context, state) => const AgentBroadcastListScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentVisits,
            builder: (context, state) => const AgentVisitsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentSettings,
            builder: (context, state) => const AgentSettingsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentPayouts,
            builder: (context, state) => const AgentPayoutsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentRatings,
            builder: (context, state) => const AgentRatingsScreen(),
          ),
          GoRoute(path: RoutePaths.agentOfficeVisits, builder: (context, state) => const AgentOfficeVisitsScreen()),
          GoRoute(path: RoutePaths.agentRequirements, builder: (context, state) => const AgentRequirementsScreen()),
          GoRoute(
            path: RoutePaths.agentDigest,
            builder: (context, state) => const AgentDigestScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentGoldListings,
            builder: (context, state) => const AgentGoldListingsScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentSubscription,
            builder: (context, state) => const AgentSubscriptionScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentCycle,
            builder: (context, state) => const AgentCycleScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentDeals,
            builder: (context, state) => const AgentDealsListScreen(),
          ),
          GoRoute(
            path: RoutePaths.agentShopQr,
            builder: (context, state) => const AgentMyQrScreen(),
          ),
        ],
      ),
    ],
  );
}
