-- AlterTable
ALTER TABLE `Project` ADD COLUMN `reraNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Property` ADD COLUMN `condition` ENUM('NEW_BOOKING', 'RESALE') NULL;
