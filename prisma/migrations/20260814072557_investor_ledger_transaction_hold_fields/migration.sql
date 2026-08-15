-- AlterTable
ALTER TABLE `investorledgerentry` ADD COLUMN `customerTransactionRef` VARCHAR(191) NULL,
    ADD COLUMN `holdDurationDays` INTEGER NULL;
