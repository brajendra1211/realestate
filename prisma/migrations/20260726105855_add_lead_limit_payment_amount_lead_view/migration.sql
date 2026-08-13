-- AlterTable
ALTER TABLE `Plan` ADD COLUMN `leadLimit` INTEGER NULL;

-- AlterTable
ALTER TABLE `Subscription` ADD COLUMN `amount` INTEGER NULL;

-- CreateTable
CREATE TABLE `LeadView` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `enquiryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadView_userId_idx`(`userId`),
    UNIQUE INDEX `LeadView_userId_enquiryId_key`(`userId`, `enquiryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LeadView` ADD CONSTRAINT `LeadView_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadView` ADD CONSTRAINT `LeadView_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `Enquiry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
