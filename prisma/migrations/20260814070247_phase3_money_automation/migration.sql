-- AlterTable
ALTER TABLE `investorprofile` ADD COLUMN `feePaymentMode` ENUM('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NETBANKING') NULL;

-- AlterTable
ALTER TABLE `sitesettings` ADD COLUMN `tdsPercent` INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE `Deal` (
    `id` VARCHAR(191) NOT NULL,
    `dealValue` INTEGER NOT NULL,
    `buyerAgentId` VARCHAR(191) NULL,
    `sellerAgentId` VARCHAR(191) NULL,
    `buyerCommission` INTEGER NULL,
    `sellerCommission` INTEGER NULL,
    `paymentMode` ENUM('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NETBANKING') NOT NULL,
    `note` TEXT NULL,
    `dealDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Deal_buyerAgentId_idx`(`buyerAgentId`),
    INDEX `Deal_sellerAgentId_idx`(`sellerAgentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfitDistribution` (
    `id` VARCHAR(191) NOT NULL,
    `investorProfileId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `totalProfit` INTEGER NOT NULL,
    `agentShare` INTEGER NOT NULL,
    `expenseShare` INTEGER NOT NULL,
    `investorShare` INTEGER NOT NULL,
    `companyShare` INTEGER NOT NULL,
    `paymentMode` ENUM('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NETBANKING') NOT NULL,
    `note` TEXT NULL,
    `distributedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProfitDistribution_investorProfileId_idx`(`investorProfileId`),
    INDEX `ProfitDistribution_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestorLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `investorProfileId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `refId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InvestorLedgerEntry_investorProfileId_idx`(`investorProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayoutRequest` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `grossAmount` INTEGER NOT NULL,
    `tdsPercent` INTEGER NOT NULL,
    `tdsAmount` INTEGER NOT NULL,
    `netAmount` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `paymentMode` ENUM('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NETBANKING') NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    INDEX `PayoutRequest_agentId_idx`(`agentId`),
    INDEX `PayoutRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_buyerAgentId_fkey` FOREIGN KEY (`buyerAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_sellerAgentId_fkey` FOREIGN KEY (`sellerAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfitDistribution` ADD CONSTRAINT `ProfitDistribution_investorProfileId_fkey` FOREIGN KEY (`investorProfileId`) REFERENCES `InvestorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfitDistribution` ADD CONSTRAINT `ProfitDistribution_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestorLedgerEntry` ADD CONSTRAINT `InvestorLedgerEntry_investorProfileId_fkey` FOREIGN KEY (`investorProfileId`) REFERENCES `InvestorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayoutRequest` ADD CONSTRAINT `PayoutRequest_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
