-- AlterTable
ALTER TABLE `Plan` MODIFY `role` ENUM('OWNER', 'DEALER', 'BOTH', 'AGENT') NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'SUBADMIN', 'OWNER', 'DEALER', 'BUYER', 'AGENT', 'INVESTOR') NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE `AgentProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `agentCode` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `shopName` VARCHAR(191) NULL,
    `shopAddress` TEXT NULL,
    `shopLatitude` DOUBLE NULL,
    `shopLongitude` DOUBLE NULL,
    `alternatePhone` VARCHAR(191) NULL,
    `yearsExperience` INTEGER NULL,
    `staffCount` INTEGER NULL,
    `reraNumber` VARCHAR(191) NULL,
    `gstNumber` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `rejectionReason` TEXT NULL,
    `primeStatus` BOOLEAN NOT NULL DEFAULT false,
    `walletBalance` INTEGER NOT NULL DEFAULT 0,
    `warningCount` INTEGER NOT NULL DEFAULT 0,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AgentProfile_userId_key`(`userId`),
    UNIQUE INDEX `AgentProfile_agentCode_key`(`agentCode`),
    INDEX `AgentProfile_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentDocument` (
    `id` VARCHAR(191) NOT NULL,
    `agentProfileId` VARCHAR(191) NOT NULL,
    `type` ENUM('RERA_CERTIFICATE', 'TRADE_LICENSE', 'GST_CERTIFICATE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgentDocument_agentProfileId_idx`(`agentProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestorProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `investorCode` VARCHAR(191) NULL,
    `referringAgentId` VARCHAR(191) NOT NULL,
    `registrationFee` INTEGER NOT NULL DEFAULT 20000,
    `feeStatus` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
    `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `totalInvested` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InvestorProfile_userId_key`(`userId`),
    UNIQUE INDEX `InvestorProfile_investorCode_key`(`investorCode`),
    INDEX `InvestorProfile_referringAgentId_idx`(`referringAgentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommissionLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `type` ENUM('REGISTRATION_REFERRAL', 'DEAL_PROFIT_SHARE', 'BROKERAGE', 'UNLOCK_SPLIT', 'GOLD_SPLIT') NOT NULL,
    `amount` INTEGER NOT NULL,
    `refId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommissionLedgerEntry_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AgentProfile` ADD CONSTRAINT `AgentProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentDocument` ADD CONSTRAINT `AgentDocument_agentProfileId_fkey` FOREIGN KEY (`agentProfileId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestorProfile` ADD CONSTRAINT `InvestorProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestorProfile` ADD CONSTRAINT `InvestorProfile_referringAgentId_fkey` FOREIGN KEY (`referringAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommissionLedgerEntry` ADD CONSTRAINT `CommissionLedgerEntry_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
