-- AlterTable
ALTER TABLE `User` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `facebookUrl` VARCHAR(191) NULL,
    ADD COLUMN `instagramUrl` VARCHAR(191) NULL,
    ADD COLUMN `licenseNumber` VARCHAR(191) NULL,
    ADD COLUMN `website` VARCHAR(191) NULL;
