-- Widen Role enum so both old and new values are valid during the data migration
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'AGENT', 'OWNER', 'DEALER') NOT NULL DEFAULT 'AGENT';

-- DataMigration: move existing AGENT users to DEALER before narrowing the Role enum
UPDATE `User` SET `role` = 'DEALER' WHERE `role` = 'AGENT';

-- AlterTable
ALTER TABLE `Property` ADD COLUMN `projectId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `about` TEXT NULL,
    ADD COLUMN `logoUrl` VARCHAR(191) NULL,
    ADD COLUMN `slug` VARCHAR(191) NULL,
    MODIFY `role` ENUM('ADMIN', 'OWNER', 'DEALER') NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE `Developer` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `about` TEXT NULL,
    `website` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `locality` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `metaTitle` VARCHAR(191) NULL,
    `metaDescription` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Developer_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('UPCOMING', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE') NOT NULL DEFAULT 'UPCOMING',
    `developerId` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `locality` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `priceMin` INTEGER NULL,
    `priceMax` INTEGER NULL,
    `possessionDate` DATETIME(3) NULL,
    `amenities` TEXT NULL,
    `metaTitle` VARCHAR(191) NULL,
    `metaDescription` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Project_slug_key`(`slug`),
    INDEX `Project_developerId_idx`(`developerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectImage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `locality` VARCHAR(191) NULL,
    `heroImage` VARCHAR(191) NULL,
    `metaTitle` VARCHAR(191) NULL,
    `metaDescription` TEXT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Location_slug_key`(`slug`),
    INDEX `Location_city_idx`(`city`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Property_projectId_idx` ON `Property`(`projectId`);

-- CreateIndex
CREATE INDEX `Property_city_idx` ON `Property`(`city`);

-- CreateIndex
CREATE UNIQUE INDEX `User_slug_key` ON `User`(`slug`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `Developer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectImage` ADD CONSTRAINT `ProjectImage_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
