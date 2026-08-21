-- AlterTable
ALTER TABLE `InvestorLedgerEntry` ADD COLUMN `customerTransactionRef` VARCHAR(191) NULL,
    ADD COLUMN `holdDurationDays` INTEGER NULL;
