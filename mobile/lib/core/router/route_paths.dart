/// Path constants for go_router routes.
class RoutePaths {
  RoutePaths._();

  static const splash = '/splash';
  static const home = '/';
  static const search = '/search';
  static const listingDetail = '/listing/:slug';
  static const leaderboard = '/leaderboard';
  static const rateAgent = '/rate/:agentCode';
  static const qrScanner = '/qr-scanner';
  static const agentShop = '/shop/:agentCode';

  static const account = '/account';

  static const buyerLogin = '/buyer/login';
  static const buyerVerify = '/buyer/verify';
  static const buyerDashboard = '/buyer/dashboard';
  static const buyerDirectVisit = '/buyer/direct-visit';
  static const buyerGoldListing = '/buyer/gold-listing';
  static const buyerDispatch = '/buyer/dispatch';

  static const investorLogin = '/investor/login';
  static const investorVerify = '/investor/verify';
  static const investorDashboard = '/investor/dashboard';
  static const investorDocuments = '/investor/documents';

  static const agentLogin = '/agent/login';
  static const agentVerify = '/agent/verify';
  static const agentForgotPassword = '/agent/forgot-password';
  static const agentRegister = '/agent/register';
  static const agentDashboard = '/agent/dashboard';
  static const agentProfile = '/agent/profile';
  static const agentListings = '/agent/listings';
  static const agentListingNew = '/agent/listings/new';
  static const agentCommissions = '/agent/commissions';
  static const agentInvestors = '/agent/investors';
  static const agentDocuments = '/agent/documents';
  static const agentDispatch = '/agent/dispatch';
  static const agentAppointments = '/agent/appointments';
  static const agentBroadcast = '/agent/broadcast';
  static const agentVisits = '/agent/visits';
  static const agentPayouts = '/agent/payouts';
  static const agentRatings = '/agent/ratings';
  static const agentDigest = '/agent/digest';
  static const agentGoldListings = '/agent/gold-listings';
  static const agentMore = '/agent/more';
  static const agentSubscription = '/agent/subscription';
  static const agentCycle = '/agent/cycle';
  static const agentDeals = '/agent/deals';

  static String listingDetailPath(String slug) => '/listing/$slug';
  static String rateAgentPath(String agentCode) => '/rate/$agentCode';
  static String agentShopPath(String agentCode) => '/shop/$agentCode';
}
