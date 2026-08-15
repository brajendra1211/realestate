-- CreateTable
CREATE TABLE `VisitAppointment` (
    `id` VARCHAR(191) NOT NULL,
    `bookingCode` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `masterPropertyId` VARCHAR(191) NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `followUpDueAt` DATETIME(3) NULL,
    `reminderSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VisitAppointment_bookingCode_key`(`bookingCode`),
    INDEX `VisitAppointment_buyerId_idx`(`buyerId`),
    INDEX `VisitAppointment_agentId_idx`(`agentId`),
    INDEX `VisitAppointment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VisitAppointment` ADD CONSTRAINT `VisitAppointment_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitAppointment` ADD CONSTRAINT `VisitAppointment_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitAppointment` ADD CONSTRAINT `VisitAppointment_masterPropertyId_fkey` FOREIGN KEY (`masterPropertyId`) REFERENCES `MasterProperty`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
