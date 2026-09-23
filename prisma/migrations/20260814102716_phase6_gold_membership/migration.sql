-- AlterTable
ALTER TABLE `AgentListing` ADD COLUMN `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN `source` ENUM('AGENT', 'CUSTOMER_GOLD') NOT NULL DEFAULT 'AGENT',
    ADD COLUMN `videoUrl` VARCHAR(191) NULL,
    MODIFY `agentId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `GoldListingPurchase` (
    `id` VARCHAR(191) NOT NULL,
    `agentListingId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 500,
    `agentSplit` INTEGER NOT NULL DEFAULT 0,
    `companySplit` INTEGER NOT NULL DEFAULT 500,
    `razorpayOrderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GoldListingPurchase_agentListingId_key`(`agentListingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AgentListing_source_approvalStatus_idx` ON `AgentListing`(`source`, `approvalStatus`);

-- AddForeignKey
ALTER TABLE `GoldListingPurchase` ADD CONSTRAINT `GoldListingPurchase_agentListingId_fkey` FOREIGN KEY (`agentListingId`) REFERENCES `AgentListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoldListingPurchase` ADD CONSTRAINT `GoldListingPurchase_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
