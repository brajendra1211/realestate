-- CreateTable
CREATE TABLE `BuyerInterest` (
    `id` VARCHAR(191) NOT NULL,
    `unlockId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `agentListingId` VARCHAR(191) NOT NULL,
    `primaryAgentId` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `listingTitle` VARCHAR(191) NOT NULL,
    `listingCity` VARCHAR(191) NULL,
    `listingLocality` VARCHAR(191) NULL,
    `listingType` VARCHAR(191) NOT NULL,
    `propertyType` VARCHAR(191) NOT NULL,
    `listingPrice` INTEGER NOT NULL,
    `bedrooms` INTEGER NULL,
    `status` ENUM('OPEN', 'ACCEPTED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `acceptedByAgentId` VARCHAR(191) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `notifiedAgentIds` TEXT NULL,
    `buzzCount` INTEGER NOT NULL DEFAULT 0,
    `adminNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BuyerInterest_unlockId_key`(`unlockId`),
    INDEX `BuyerInterest_status_idx`(`status`),
    INDEX `BuyerInterest_buyerId_idx`(`buyerId`),
    INDEX `BuyerInterest_acceptedByAgentId_idx`(`acceptedByAgentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BuyerInterest` ADD CONSTRAINT `BuyerInterest_unlockId_fkey` FOREIGN KEY (`unlockId`) REFERENCES `PropertyUnlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuyerInterest` ADD CONSTRAINT `BuyerInterest_acceptedByAgentId_fkey` FOREIGN KEY (`acceptedByAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `BuyerInterestAcceptance` (
    `id` VARCHAR(191) NOT NULL,
    `interestId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BuyerInterestAcceptance_interestId_agentId_key`(`interestId`, `agentId`),
    INDEX `BuyerInterestAcceptance_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BuyerInterestAcceptance` ADD CONSTRAINT `BuyerInterestAcceptance_interestId_fkey` FOREIGN KEY (`interestId`) REFERENCES `BuyerInterest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuyerInterestAcceptance` ADD CONSTRAINT `BuyerInterestAcceptance_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
