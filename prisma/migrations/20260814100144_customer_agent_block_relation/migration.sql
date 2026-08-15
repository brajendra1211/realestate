-- AddForeignKey
ALTER TABLE `CustomerAgentBlock` ADD CONSTRAINT `CustomerAgentBlock_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
