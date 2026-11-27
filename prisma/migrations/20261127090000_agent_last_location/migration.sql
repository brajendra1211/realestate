ALTER TABLE `AgentProfile` ADD COLUMN `lastLatitude` DOUBLE NULL;
ALTER TABLE `AgentProfile` ADD COLUMN `lastLongitude` DOUBLE NULL;
ALTER TABLE `AgentProfile` ADD COLUMN `lastLocationAt` DATETIME(3) NULL;
