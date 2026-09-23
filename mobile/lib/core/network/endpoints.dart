/// Flat path constants for every backend route the app calls. Services
/// should never hardcode a path string directly.
class Endpoints {
  Endpoints._();

  // --- Auth (NextAuth built-in REST routes) ---
  static const authCsrf = '/api/auth/csrf';
  static const authCallbackCredentials = '/api/auth/callback/credentials';
  static String authCallback(String provider) => '/api/auth/callback/$provider';
  static const authSession = '/api/auth/session';
  static const authSignout = '/api/auth/signout';

  // --- Buyer ---
  static const buyerOtpRequest = '/api/buyer/otp';
  static const buyerMe = '/api/buyer/me';
  static const buyerSavedProperties = '/api/buyer/saved-properties';
  static const buyerAppointments = '/api/buyer/appointments';
  static String buyerAppointmentNoShow(String id) =>
      '/api/buyer/appointments/$id/no-show';
  static const buyerSwitchAgent = '/api/buyer/switch-agent';

  // --- Investor ---
  static const investorOtpRequest = '/api/investor/otp';
  static const investorMe = '/api/investor/me';
  static const investorLedger = '/api/investor/ledger';
  static const investorDocuments = '/api/investor/documents';

  // --- Public / consumer ---
  static const listings = '/api/listings';
  static String listingDetail(String slug) => '/api/listings/$slug';
  static String listingUnlock(String slug) => '/api/listings/$slug/unlock';
  static String rateAgent(String agentCode) => '/api/rate/$agentCode';
  static const leaderboard = '/api/leaderboard';

  // --- Uploads ---
  static const uploadDocument = '/api/upload/document';

  // --- Agent ---
  static const agentRegister = '/api/agent/register';
  static const agentMe = '/api/agent/me';
  static const agentCommissions = '/api/agent/commissions';
  static const agentInvestors = '/api/agent/investors';
  static const agentListingsDedupSearch = '/api/agent/listings/dedup-search';
  static const agentListings = '/api/agent/listings';
  static const agentListingsUploadImage = '/api/agent/listings/upload-image';
  static const agentDispatch = '/api/agent/dispatch';
  static const agentAppointments = '/api/agent/appointments';
  static String agentAppointmentAction(String id) =>
      '/api/agent/appointments/$id';
  static const agentBroadcast = '/api/agent/broadcast';
  static const agentBroadcastOwn = '/api/agent/broadcast/own';
  static const agentBroadcastSocieties = '/api/agent/broadcast/societies';
  static String agentBroadcastRespond(String id) =>
      '/api/agent/broadcast/$id/respond';
  static String agentBroadcastClose(String id) =>
      '/api/agent/broadcast/$id/close';
  static String agentBroadcastChat(String id, String agentId) =>
      '/api/agent/broadcast/$id/chat/$agentId';
  static const agentDocuments = '/api/agent/documents';
  static const agentGoldListings = '/api/agent/gold-listings';
  static const agentVisitsOtp = '/api/agent/visits/otp';
  static const agentVisits = '/api/agent/visits';
  static const agentPayouts = '/api/agent/payouts';
  static const agentRatings = '/api/agent/ratings';
  static const agentDigest = '/api/agent/digest';

  // --- Dispatch (shared buyer/agent routes used from the agent side) ---
  static String dispatchDetail(String id) => '/api/dispatch/$id';
  static String dispatchAccept(String id) => '/api/dispatch/$id/accept';

  // --- Geo (all but `nearest` require a logged-in session of any role) ---
  static const geoCountries = '/api/geo/countries';
  static const geoStates = '/api/geo/states';
  static const geoCities = '/api/geo/cities';
  static const geoLocalities = '/api/geo/localities';
  static const geoLocationListings = '/api/geo/location-listings';
  static const geoNearest = '/api/geo/nearest';

  // --- Buyer direct visit + anti-bypass agreement ---
  static const buyerDirectVisitRequest = '/api/buyer/direct-visit/request';
  static const buyerDirectVisitVerify = '/api/buyer/direct-visit/verify';
  static String agreementSign(String id) => '/api/agreements/$id/sign';

  // --- Customer Gold self-listing (distinct from agent/gold-listings feed) ---
  static const goldListingsCreate = '/api/gold-listings';
  static const goldListingsUploadImage = '/api/gold-listings/upload-image';
  static const goldListingsVerify = '/api/gold-listings/verify';

  // --- Agent subscription / membership ---
  static const agentSubscriptionPlans = '/api/agent/subscription/plans';
  static const agentSubscriptionStatus = '/api/agent/subscription/status';
  static const agentSubscriptionAutopayMandate =
      '/api/agent/subscription/autopay-mandate';

  // --- Agent 60-day review cycle + coupon (GET progress / POST claim, same path) ---
  static const agentCycle = '/api/agent/cycle';

  // --- Agent B2B deals ---
  static const agentDeals = '/api/agent/deals';
  static String agentDealStage(String id) => '/api/agent/deals/$id/stage';

  // --- Small gaps ---
  static const listingsHotDeals = '/api/listings/hot-deals';
  static String agentListingRenew(String id) => '/api/agent/listings/$id/renew';
  static const agentLookup = '/api/agent/lookup';
  static const dispatchCreate = '/api/dispatch';
  static const dispatchVerify = '/api/dispatch/verify';
  static String dispatchCancel(String id) => '/api/dispatch/$id/cancel';
  static const uploadGeneric = '/api/upload';
}
