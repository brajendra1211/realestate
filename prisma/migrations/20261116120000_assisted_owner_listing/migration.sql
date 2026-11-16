-- CreateTable
CREATE TABLE `ListingRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `ownerName` VARCHAR(191) NOT NULL,
    `ownerPhone` VARCHAR(191) NOT NULL,
    `ownerEmail` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `locality` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `plan` ENUM('BASIC', 'GOLD') NOT NULL DEFAULT 'BASIC',
    `amount` INTEGER NOT NULL,
    `agentSplit` INTEGER NOT NULL,
    `companySplit` INTEGER NOT NULL,
    `referredByAgentCode` VARCHAR(191) NULL,
    `razorpayOrderId` VARCHAR(191) NULL,
    `status` ENUM('PENDING_PAYMENT', 'SEARCHING', 'ACCEPTED', 'LINK_SENT', 'SUBMITTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `statusToken` VARCHAR(191) NOT NULL,
    `formToken` VARCHAR(191) NOT NULL,
    `alertedAgentIds` TEXT NULL,
    `buzzCount` INTEGER NOT NULL DEFAULT 0,
    `lastBuzzAt` DATETIME(3) NULL,
    `acceptedByAgentId` VARCHAR(191) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `linkSentAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `agentListingId` VARCHAR(191) NULL,
    `adminNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ListingRequest_statusToken_key`(`statusToken`),
    UNIQUE INDEX `ListingRequest_formToken_key`(`formToken`),
    UNIQUE INDEX `ListingRequest_agentListingId_key`(`agentListingId`),
    INDEX `ListingRequest_status_idx`(`status`),
    INDEX `ListingRequest_acceptedByAgentId_idx`(`acceptedByAgentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ListingRequest` ADD CONSTRAINT `ListingRequest_acceptedByAgentId_fkey` FOREIGN KEY (`acceptedByAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingRequest` ADD CONSTRAINT `ListingRequest_agentListingId_fkey` FOREIGN KEY (`agentListingId`) REFERENCES `AgentListing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
