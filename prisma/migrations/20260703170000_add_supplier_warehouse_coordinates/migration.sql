ALTER TABLE `suppliers`
  ADD COLUMN `latitude` DECIMAL(10, 7) NULL AFTER `city`,
  ADD COLUMN `longitude` DECIMAL(10, 7) NULL AFTER `latitude`;

ALTER TABLE `warehouses`
  ADD COLUMN `latitude` DECIMAL(10, 7) NULL AFTER `address`,
  ADD COLUMN `longitude` DECIMAL(10, 7) NULL AFTER `latitude`;
