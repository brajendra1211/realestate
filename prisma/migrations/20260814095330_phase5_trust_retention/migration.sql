-- AlterTable
ALTER TABLE `AgentProfile` ADD COLUMN `ratingAvg` DOUBLE NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `PropertyVisitLog` (
    `id` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NULL,
    `masterPropertyId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `otpVerified` BOOLEAN NOT NULL DEFAULT true,
    `isPrimaryOwner` BOOLEAN NOT NULL DEFAULT true,
    `conflictWithAgentId` VARCHAR(191) NULL,
    `visitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PropertyVisitLog_customerPhone_masterPropertyId_idx`(`customerPhone`, `masterPropertyId`),
    INDEX `PropertyVisitLog_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentRating` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `masterPropertyId` VARCHAR(191) NULL,
    `stars` INTEGER NOT NULL,
    `review` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgentRating_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentWarning` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgentWarning_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerAgentBlock` (
    `id` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerAgentBlock_customerPhone_idx`(`customerPhone`),
    UNIQUE INDEX `CustomerAgentBlock_customerPhone_agentId_key`(`customerPhone`, `agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentSwitchLog` (
    `id` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `fromAgentId` VARCHAR(191) NOT NULL,
    `toAgentId` VARCHAR(191) NULL,
    `reason` TEXT NOT NULL,
    `isComplaint` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgentSwitchLog_customerPhone_idx`(`customerPhone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentVaultItem` (
    `id` VARCHAR(191) NOT NULL,
    `masterPropertyId` VARCHAR(191) NULL,
    `dealId` VARCHAR(191) NULL,
    `agentId` VARCHAR(191) NULL,
    `investorId` VARCHAR(191) NULL,
    `type` ENUM('REGISTRY', 'SALE_DEED', 'AGREEMENT_TO_SELL', 'ENCUMBRANCE_CERTIFICATE', 'LAYOUT_PLAN', 'PAYMENT_RECEIPT', 'SIGNED_AGREEMENT', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `uploadedByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentVaultItem_masterPropertyId_idx`(`masterPropertyId`),
    INDEX `DocumentVaultItem_agentId_idx`(`agentId`),
    INDEX `DocumentVaultItem_investorId_idx`(`investorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerInvestorAgreement` (
    `id` VARCHAR(191) NOT NULL,
    `investorId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `agreementDate` DATETIME(3) NOT NULL,
    `lockInPeriodMonths` INTEGER NULL,
    `flatUnitNumber` VARCHAR(191) NULL,
    `terms` TEXT NULL,
    `signedCopyUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerInvestorAgreement_investorId_idx`(`investorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PropertyVisitLog` ADD CONSTRAINT `PropertyVisitLog_masterPropertyId_fkey` FOREIGN KEY (`masterPropertyId`) REFERENCES `MasterProperty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyVisitLog` ADD CONSTRAINT `PropertyVisitLog_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentRating` ADD CONSTRAINT `AgentRating_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentWarning` ADD CONSTRAINT `AgentWarning_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVaultItem` ADD CONSTRAINT `DocumentVaultItem_masterPropertyId_fkey` FOREIGN KEY (`masterPropertyId`) REFERENCES `MasterProperty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVaultItem` ADD CONSTRAINT `DocumentVaultItem_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVaultItem` ADD CONSTRAINT `DocumentVaultItem_investorId_fkey` FOREIGN KEY (`investorId`) REFERENCES `InvestorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerInvestorAgreement` ADD CONSTRAINT `CustomerInvestorAgreement_investorId_fkey` FOREIGN KEY (`investorId`) REFERENCES `InvestorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
