-- AlterTable
ALTER TABLE `Property` ADD COLUMN `assignedAgentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Property_assignedAgentId_idx` ON `Property`(`assignedAgentId`);

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `AgentProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
