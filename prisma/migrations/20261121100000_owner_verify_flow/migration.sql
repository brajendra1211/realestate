-- Owner flow: pay -> owner fills details -> buzzer 5/10/15 km -> partner verifies on site with the owner's OTP.
ALTER TABLE `ListingRequest` MODIFY COLUMN `status` ENUM('PENDING_PAYMENT', 'DETAILS_PENDING', 'SEARCHING', 'ACCEPTED', 'LINK_SENT', 'SUBMITTED', 'CANCELLED', 'ADMIN_DESK') NOT NULL DEFAULT 'PENDING_PAYMENT';
ALTER TABLE `ListingRequest`
  ADD COLUMN `detailsJson` LONGTEXT NULL,
  ADD COLUMN `detailsAt` DATETIME(3) NULL,
  ADD COLUMN `buzzRadiusKm` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `searchStartedAt` DATETIME(3) NULL,
  ADD COLUMN `skippedAgentIds` TEXT NULL;

-- Plan prices: Basic Rs 299, Pro (Gold) Rs 499
ALTER TABLE `SiteSettings` MODIFY COLUMN `basicListingFee` INTEGER NOT NULL DEFAULT 299;
ALTER TABLE `SiteSettings` MODIFY COLUMN `goldListingFee` INTEGER NOT NULL DEFAULT 499;
UPDATE `SiteSettings` SET `basicListingFee` = 299 WHERE `basicListingFee` = 300;
UPDATE `SiteSettings` SET `goldListingFee` = 499 WHERE `goldListingFee` = 500;
