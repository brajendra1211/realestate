-- Live location of every signed-in person (mandatory for all roles except admin); partners are buzzed by where they are now.
ALTER TABLE `User`
  ADD COLUMN `liveLatitude` DOUBLE NULL,
  ADD COLUMN `liveLongitude` DOUBLE NULL,
  ADD COLUMN `liveLocationAt` DATETIME(3) NULL;
