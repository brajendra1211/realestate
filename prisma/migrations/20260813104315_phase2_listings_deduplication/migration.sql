-- CreateTable
CREATE TABLE `MasterProperty` (
    `id` VARCHAR(191) NOT NULL,
    `masterId` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `locality` VARCHAR(191) NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MasterProperty_masterId_key`(`masterId`),
    INDEX `MasterProperty_city_idx`(`city`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentListing` (
    `id` VARCHAR(191) NOT NULL,
    `masterPropertyId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `listingType` ENUM('SALE', 'RENT') NOT NULL,
    `propertyType` ENUM('APARTMENT', 'VILLA', 'INDEPENDENT_HOUSE', 'PLOT', 'COMMERCIAL', 'OFFICE') NOT NULL,
    `bedrooms` INTEGER NULL,
    `bathrooms` INTEGER NULL,
    `areaSqft` INTEGER NULL,
    `price` INTEGER NOT NULL,
    `exactAddress` TEXT NOT NULL,
    `amenities` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AgentListing_slug_key`(`slug`),
    INDEX `AgentListing_masterPropertyId_idx`(`masterPropertyId`),
    INDEX `AgentListing_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentListingImage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `agentListingId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyUnlock` (
    `id` VARCHAR(191) NOT NULL,
    `agentListingId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 100,
    `agentSplit` INTEGER NOT NULL DEFAULT 50,
    `companySplit` INTEGER NOT NULL DEFAULT 50,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PropertyUnlock_buyerId_idx`(`buyerId`),
    UNIQUE INDEX `PropertyUnlock_agentListingId_buyerId_key`(`agentListingId`, `buyerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AgentListing` ADD CONSTRAINT `AgentListing_masterPropertyId_fkey` FOREIGN KEY (`masterPropertyId`) REFERENCES `MasterProperty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentListing` ADD CONSTRAINT `AgentListing_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentListingImage` ADD CONSTRAINT `AgentListingImage_agentListingId_fkey` FOREIGN KEY (`agentListingId`) REFERENCES `AgentListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyUnlock` ADD CONSTRAINT `PropertyUnlock_agentListingId_fkey` FOREIGN KEY (`agentListingId`) REFERENCES `AgentListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyUnlock` ADD CONSTRAINT `PropertyUnlock_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
