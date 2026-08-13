-- AlterTable
ALTER TABLE `Enquiry` ADD COLUMN `buyerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `email` VARCHAR(191) NULL,
    MODIFY `passwordHash` VARCHAR(191) NULL,
    MODIFY `role` ENUM('ADMIN', 'OWNER', 'DEALER', 'BUYER') NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE `OtpCode` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `channel` ENUM('WHATSAPP', 'EMAIL') NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OtpCode_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SavedProperty` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SavedProperty_userId_idx`(`userId`),
    INDEX `SavedProperty_propertyId_idx`(`propertyId`),
    UNIQUE INDEX `SavedProperty_userId_propertyId_key`(`userId`, `propertyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Enquiry_buyerId_idx` ON `Enquiry`(`buyerId`);

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedProperty` ADD CONSTRAINT `SavedProperty_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedProperty` ADD CONSTRAINT `SavedProperty_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
