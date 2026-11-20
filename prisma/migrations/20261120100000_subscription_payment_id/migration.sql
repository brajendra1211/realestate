ALTER TABLE `Subscription` ADD COLUMN `razorpayPaymentId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Subscription_razorpayPaymentId_key` ON `Subscription`(`razorpayPaymentId`);
