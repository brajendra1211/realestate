-- CreateTable
CREATE TABLE `DispatchRequest` (
    `id` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 100,
    `agentSplit` INTEGER NOT NULL DEFAULT 50,
    `companySplit` INTEGER NOT NULL DEFAULT 50,
    `paymentMode` ENUM('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NETBANKING') NULL,
    `razorpayOrderId` VARCHAR(191) NULL,
    `status` ENUM('SEARCHING', 'MATCHED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'SEARCHING',
    `currentRadiusKm` INTEGER NOT NULL DEFAULT 1,
    `currentBatch` INTEGER NOT NULL DEFAULT 1,
    `batchStartedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedByAgentId` VARCHAR(191) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DispatchRequest_buyerId_idx`(`buyerId`),
    INDEX `DispatchRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DispatchNotification` (
    `id` VARCHAR(191) NOT NULL,
    `dispatchRequestId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `batch` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DispatchNotification_agentId_idx`(`agentId`),
    UNIQUE INDEX `DispatchNotification_dispatchRequestId_agentId_key`(`dispatchRequestId`, `agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Broadcast` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `radiusKm` INTEGER NOT NULL,
    `society` VARCHAR(191) NULL,
    `flatSize` VARCHAR(191) NOT NULL,
    `txnType` ENUM('RENT', 'BUY', 'SELL', 'LETOUT') NOT NULL,
    `budgetMin` INTEGER NOT NULL,
    `budgetMax` INTEGER NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Broadcast_agentId_idx`(`agentId`),
    INDEX `Broadcast_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BroadcastResponse` (
    `id` VARCHAR(191) NOT NULL,
    `broadcastId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BroadcastResponse_agentId_idx`(`agentId`),
    UNIQUE INDEX `BroadcastResponse_broadcastId_agentId_key`(`broadcastId`, `agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `broadcastId` VARCHAR(191) NOT NULL,
    `fromAgentId` VARCHAR(191) NOT NULL,
    `toAgentId` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgentChatMessage_broadcastId_idx`(`broadcastId`),
    INDEX `AgentChatMessage_toAgentId_idx`(`toAgentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DispatchRequest` ADD CONSTRAINT `DispatchRequest_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispatchRequest` ADD CONSTRAINT `DispatchRequest_acceptedByAgentId_fkey` FOREIGN KEY (`acceptedByAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispatchNotification` ADD CONSTRAINT `DispatchNotification_dispatchRequestId_fkey` FOREIGN KEY (`dispatchRequestId`) REFERENCES `DispatchRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispatchNotification` ADD CONSTRAINT `DispatchNotification_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BroadcastResponse` ADD CONSTRAINT `BroadcastResponse_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `Broadcast`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BroadcastResponse` ADD CONSTRAINT `BroadcastResponse_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentChatMessage` ADD CONSTRAINT `AgentChatMessage_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `Broadcast`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentChatMessage` ADD CONSTRAINT `AgentChatMessage_fromAgentId_fkey` FOREIGN KEY (`fromAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentChatMessage` ADD CONSTRAINT `AgentChatMessage_toAgentId_fkey` FOREIGN KEY (`toAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
