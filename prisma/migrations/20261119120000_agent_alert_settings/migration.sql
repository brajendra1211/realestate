-- AlterTable
ALTER TABLE `AgentProfile` ADD COLUMN `buzzerAlerts` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `listingAlerts` BOOLEAN NOT NULL DEFAULT true;
