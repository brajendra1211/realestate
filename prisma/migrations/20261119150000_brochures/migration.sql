ALTER TABLE `AgentProfile` ADD COLUMN `brochureCredits` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `Brochure` (
  `id` VARCHAR(191) NOT NULL,
  `agentId` VARCHAR(191) NOT NULL,
  `sourceType` VARCHAR(191) NOT NULL,
  `sourceRef` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `data` LONGTEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Brochure_agentId_createdAt_idx`(`agentId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BrochureRecharge` (
  `id` VARCHAR(191) NOT NULL,
  `agentId` VARCHAR(191) NOT NULL,
  `amount` INTEGER NOT NULL,
  `credits` INTEGER NOT NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'PAID',
  `razorpayOrderId` VARCHAR(191) NULL,
  `razorpayPaymentId` VARCHAR(191) NULL,
  `note` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `BrochureRecharge_agentId_createdAt_idx`(`agentId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Brochure` ADD CONSTRAINT `Brochure_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BrochureRecharge` ADD CONSTRAINT `BrochureRecharge_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `AgentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
