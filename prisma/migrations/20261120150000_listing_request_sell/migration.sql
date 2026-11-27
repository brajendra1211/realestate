-- Owners can now choose to SELL as well as rent. A sell request is handled by the admin team only
-- (status ADMIN_DESK) and is never shown to or alerted to any channel partner.
ALTER TABLE `ListingRequest` ADD COLUMN `purpose` ENUM('RENT', 'SELL') NOT NULL DEFAULT 'RENT';
ALTER TABLE `ListingRequest` MODIFY COLUMN `status` ENUM('PENDING_PAYMENT', 'SEARCHING', 'ACCEPTED', 'LINK_SENT', 'SUBMITTED', 'CANCELLED', 'ADMIN_DESK') NOT NULL DEFAULT 'PENDING_PAYMENT';
