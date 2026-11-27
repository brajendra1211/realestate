import 'package:dio/dio.dart';

import '../core/network/api_exception.dart';
import 'owner_service.dart';

/// An owner request offered to this partner by the buzzer (no owner contact yet).
class OwnerBuzz {
  OwnerBuzz(Map<String, dynamic> j)
      : id = j['id'] as String,
        city = j['city'] as String? ?? '',
        locality = j['locality'] as String?,
        plan = j['plan'] as String? ?? 'BASIC',
        buzzCount = (j['buzzCount'] as num?)?.toInt() ?? 0,
        distanceKm = (j['distanceKm'] as num?)?.toDouble(),
        mapUrl = j['mapUrl'] as String?,
        property = j['property'] is Map ? Map<String, dynamic>.from(j['property'] as Map) : null;

  final String id;
  final String city;
  final String? locality;
  final String plan;
  final int buzzCount;
  final double? distanceKm;
  final String? mapUrl;
  final Map<String, dynamic>? property;

  String get key => 'o:$id:$buzzCount';
  String get planName => plan == 'GOLD' ? 'Pro' : 'Basic';
}

class BuyerBuzz {
  BuyerBuzz(Map<String, dynamic> j)
      : id = j['id'] as String,
        title = j['title'] as String? ?? '',
        summary = j['summary'] as String? ?? '',
        primary = j['primary'] as bool? ?? false,
        where = j['where'] as String? ?? '',
        kind = j['kind'] as String? ?? '',
        price = (j['price'] as num?)?.toInt(),
        listedByLabel = j['listedByLabel'] as String? ?? '',
        distanceKm = (j['distanceKm'] as num?)?.toDouble(),
        stage = j['stage'] as String? ?? '',
        buzzCount = (j['buzzCount'] as num?)?.toInt() ?? 0;

  final String id;
  final String title;
  final String summary;
  final bool primary;
  final String where;
  final String kind;
  final int? price;
  final String listedByLabel;
  final double? distanceKm;
  final String stage;
  final int buzzCount;

  String get key => 'b:$id:$buzzCount';
}

class AcceptedOwnerRequest {
  AcceptedOwnerRequest(Map<String, dynamic> j)
      : id = j['id'] as String,
        status = j['status'] as String,
        ownerName = j['ownerName'] as String? ?? '',
        ownerPhone = j['ownerPhone'] as String? ?? '',
        city = j['city'] as String? ?? '',
        locality = j['locality'] as String?,
        plan = j['plan'] as String? ?? 'BASIC',
        agentSplit = (j['agentSplit'] as num?)?.toInt() ?? 0,
        latitude = (j['latitude'] as num?)?.toDouble(),
        longitude = (j['longitude'] as num?)?.toDouble(),
        listingSlug = j['listingSlug'] as String?,
        details = j['details'] is Map ? Map<String, dynamic>.from(j['details'] as Map) : null;

  final String id;
  final String status;
  final String ownerName;
  final String ownerPhone;
  final String city;
  final String? locality;
  final String plan;
  final int agentSplit;
  final double? latitude;
  final double? longitude;
  final String? listingSlug;
  final Map<String, dynamic>? details;

  bool get verified => status == 'SUBMITTED';
  String get planName => plan == 'GOLD' ? 'Pro' : 'Basic';
}

class BuyerLead {
  BuyerLead(Map<String, dynamic> j)
      : buyerName = j['buyerName'] as String? ?? 'Buyer',
        buyerPhone = j['buyerPhone'] as String?,
        propertyTitle = j['propertyTitle'] as String? ?? '',
        propertyWhere = j['propertyWhere'] as String? ?? '',
        listedByLabel = j['listedByLabel'] as String? ?? '',
        acceptedAt = j['acceptedAt'] as String? ?? '';
  final String propertyTitle;
  final String propertyWhere;
  final String listedByLabel;
  final String buyerName;
  final String? buyerPhone;
  final String acceptedAt;
}

class BuyerLeadsData {
  BuyerLeadsData({required this.shopLink, required this.waiting, required this.accepted});
  final String? shopLink;
  final List<BuyerBuzz> waiting;
  final List<BuyerLead> accepted;
}

class Brochure {
  Brochure(Map<String, dynamic> j)
      : id = j['id'] as String,
        title = j['title'] as String? ?? '',
        url = j['url'] as String? ?? '',
        createdAt = j['createdAt'] as String? ?? '';
  final String id;
  final String title;
  final String url;
  final String createdAt;
}

class BrochuresData {
  BrochuresData({required this.credits, required this.packPrice, required this.packCredits, required this.brochures});
  final int credits;
  final int packPrice;
  final int packCredits;
  final List<Brochure> brochures;
}

class PaymentOrder {
  const PaymentOrder({required this.orderId, required this.amountPaise, required this.keyId});
  final String orderId;
  final int amountPaise;
  final String keyId;
}

/// REST client for the partner's daily work: buzzer, owner requests (verify with OTP),
/// buyer leads, brochures and plan payments. Server messages are readable.
class AgentWorkService {
  AgentWorkService(this._dio);
  final Dio _dio;

  Future<T> _call<T>(Future<T> Function() fn) async {
    try {
      return await fn();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Buzzer poll: owner requests and buyers waiting for a partner.
  Future<({List<OwnerBuzz> owners, List<BuyerBuzz> buyers})> poll() => _call(() async {
        final res = await _dio.get('/api/agent/listing-requests');
        final d = res.data as Map;
        return (
          owners: ((d['pending'] as List?) ?? []).map((e) => OwnerBuzz(Map<String, dynamic>.from(e as Map))).toList(),
          buyers: ((d['interests'] as List?) ?? []).map((e) => BuyerBuzz(Map<String, dynamic>.from(e as Map))).toList(),
        );
      });

  Future<void> acceptOwner(String id) => _call(() => _dio.post('/api/agent/listing-requests/accept', data: {'id': id}));
  Future<void> acceptBuyer(String id) => _call(() => _dio.post('/api/agent/buyer-interests/accept', data: {'id': id}));

  Future<List<AcceptedOwnerRequest>> ownerRequests() => _call(() async {
        final res = await _dio.get('/api/agent/owner-requests');
        return ((res.data as Map)['requests'] as List)
            .map((e) => AcceptedOwnerRequest(Map<String, dynamic>.from(e as Map)))
            .toList();
      });

  Future<void> sendVerifyOtp(String id) => _call(() => _dio.post('/api/agent/owner-requests/otp', data: {'id': id}));
  Future<void> verifyOwner(String id, String code) =>
      _call(() => _dio.post('/api/agent/owner-requests/verify', data: {'id': id, 'code': code}));

  Future<BuyerLeadsData> buyerLeads() => _call(() async {
        final res = await _dio.get('/api/agent/buyer-leads');
        final d = res.data as Map;
        return BuyerLeadsData(
          shopLink: d['shopLink'] as String?,
          waiting: ((d['waiting'] as List?) ?? []).map((e) => BuyerBuzz(Map<String, dynamic>.from(e as Map))).toList(),
          accepted: ((d['accepted'] as List?) ?? []).map((e) => BuyerLead(Map<String, dynamic>.from(e as Map))).toList(),
        );
      });

  Future<BrochuresData> brochures() => _call(() async {
        final res = await _dio.get('/api/agent/brochures');
        final d = res.data as Map;
        return BrochuresData(
          credits: (d['credits'] as num).toInt(),
          packPrice: (d['packPrice'] as num).toInt(),
          packCredits: (d['packCredits'] as num).toInt(),
          brochures: ((d['brochures'] as List?) ?? []).map((e) => Brochure(Map<String, dynamic>.from(e as Map))).toList(),
        );
      });

  Future<Brochure> createBrochure(String property) => _call(() async {
        final res = await _dio.post('/api/agent/brochures', data: {'property': property});
        return Brochure({...Map<String, dynamic>.from(res.data as Map), 'createdAt': ''});
      });

  Future<PaymentOrder> brochureRechargeOrder() => _call(() async {
        final res = await _dio.post('/api/agent/brochures/recharge');
        return _order(res.data as Map);
      });

  Future<void> brochureRechargeVerify(String orderId, String paymentId, String signature) => _call(() => _dio.post(
        '/api/agent/brochures/recharge-verify',
        data: {'orderId': orderId, 'paymentId': paymentId, 'signature': signature},
      ));

  Future<PaymentOrder> planOrder(String planId, {required bool upgrade}) => _call(() async {
        final res = await _dio.post('/api/agent/subscription/order', data: {'planId': planId, 'mode': upgrade ? 'upgrade' : 'register'});
        return _order(res.data as Map);
      });

  Future<void> planVerify(String planId, {required bool upgrade, required String orderId, required String paymentId, required String signature}) =>
      _call(() => _dio.post('/api/agent/subscription/verify', data: {
            'planId': planId,
            'mode': upgrade ? 'upgrade' : 'register',
            'orderId': orderId,
            'paymentId': paymentId,
            'signature': signature,
          }));

  PaymentOrder _order(Map d) {
    final o = d['order'] as Map;
    return PaymentOrder(orderId: o['id'] as String, amountPaise: (o['amount'] as num).toInt(), keyId: d['keyId'] as String);
  }
}

String workError(Object e) => ownerErrorMessage(e);
