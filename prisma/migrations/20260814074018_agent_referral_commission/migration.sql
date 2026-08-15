-- AlterTable
ALTER TABLE `agentprofile` ADD COLUMN `referringAgentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `commissionledgerentry` MODIFY `type` ENUM('REGISTRATION_REFERRAL', 'DEAL_PROFIT_SHARE', 'BROKERAGE', 'UNLOCK_SPLIT', 'GOLD_SPLIT', 'AGENT_REFERRAL') NOT NULL;

-- CreateIndex
CREATE INDEX `AgentProfile_referringAgentId_idx` ON `AgentProfile`(`referringAgentId`);

-- AddForeignKey
ALTER TABLE `AgentProfile` ADD CONSTRAINT `AgentProfile_referringAgentId_fkey` FOREIGN KEY (`referringAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
