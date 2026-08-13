-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `ctaLink` VARCHAR(191) NULL,
    ADD COLUMN `ctaText` VARCHAR(191) NULL,
    ADD COLUMN `favicon` VARCHAR(191) NULL,
    ADD COLUMN `googleAnalyticsId` VARCHAR(191) NULL,
    ADD COLUMN `googleSiteVerification` VARCHAR(191) NULL,
    ADD COLUMN `linkedinUrl` VARCHAR(191) NULL,
    ADD COLUMN `metaDescription` TEXT NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL,
    ADD COLUMN `ogImage` VARCHAR(191) NULL,
    ADD COLUMN `whatsappNumber` VARCHAR(191) NULL;
