-- AlterTable
ALTER TABLE `customerinvestoragreement` ADD COLUMN `paymentAmount` INTEGER NULL,
    ADD COLUMN `paymentMode` ENUM('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NETBANKING') NULL;

-- CreateTable
CREATE TABLE `AreaAgentAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `pincode` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AreaAgentAssignment_pincode_idx`(`pincode`),
    UNIQUE INDEX `AreaAgentAssignment_pincode_agentId_key`(`pincode`, `agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AreaAgentAssignment` ADD CONSTRAINT `AreaAgentAssignment_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
