-- New channel partner pricing: Basic 999/mo (2499 for 3 months), Prime 1999/mo (4999 for 3 months).
-- Only rows still on the old default price are moved, so a price the admin set on purpose is kept.
UPDATE `SiteSettings` SET `agentBasicPlanPrice` = 999 WHERE `agentBasicPlanPrice` = 1000;
UPDATE `SiteSettings` SET `agentPrimePlanPrice` = 1999 WHERE `agentPrimePlanPrice` = 2000;
UPDATE `Plan` SET `price` = 999 WHERE `id` = 'plan-agent-basic' AND `price` = 1000;
UPDATE `Plan` SET `price` = 1999 WHERE `id` = 'plan-agent-prime' AND `price` = 2000;
UPDATE `Plan` SET `price` = 2499 WHERE `id` = 'plan-agent-basic-3m' AND `price` = 2500;
UPDATE `Plan` SET `price` = 4999 WHERE `id` = 'plan-agent-prime-3m' AND `price` = 5500;
ALTER TABLE `SiteSettings` ALTER COLUMN `agentBasicPlanPrice` SET DEFAULT 999;
ALTER TABLE `SiteSettings` ALTER COLUMN `agentPrimePlanPrice` SET DEFAULT 1999;
