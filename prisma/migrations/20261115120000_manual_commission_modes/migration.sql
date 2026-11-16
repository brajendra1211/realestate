-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `manualCommissionTypes` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `AgentProfile` ADD COLUMN `manualCommissionTypes` VARCHAR(191) NOT NULL DEFAULT '';
