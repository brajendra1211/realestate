/// Human-readable labels for the backend's Prisma enum values.
class EnumLabels {
  EnumLabels._();

  static String listingType(String value) => switch (value) {
        'SALE' => 'For Sale',
        'RENT' => 'For Rent',
        _ => value,
      };

  static String propertyType(String value) => switch (value) {
        'APARTMENT' => 'Apartment',
        'VILLA' => 'Villa',
        'INDEPENDENT_HOUSE' => 'Independent House',
        'PLOT' => 'Plot',
        'COMMERCIAL' => 'Commercial',
        'OFFICE' => 'Office',
        _ => value,
      };

  static String badge(String value) => switch (value) {
        'TOP_SELLER' => 'Top Seller',
        'FASTEST_RESPONDER' => 'Fastest Responder',
        '5-STAR' => '5-Star Agent',
        _ => value,
      };
}
