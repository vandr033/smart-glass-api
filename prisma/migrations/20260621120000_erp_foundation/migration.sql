ALTER TABLE `audit_logs`
  ADD COLUMN `action` VARCHAR(191) NOT NULL DEFAULT 'Updated',
  ADD COLUMN `metadata_json` JSON NULL,
  ADD COLUMN `ip_address` VARCHAR(45) NULL,
  ADD COLUMN `user_agent` VARCHAR(255) NULL;

CREATE INDEX `audit_logs_action_idx` ON `audit_logs`(`action`);

CREATE TABLE `system_settings` (
  `id` CHAR(36) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `value_json` JSON NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `system_settings_key_key`(`key`),
  INDEX `system_settings_key_idx`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `module_registry` (
  `id` CHAR(36) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `route` VARCHAR(255) NOT NULL,
  `icon` VARCHAR(100) NULL,
  `sort_order` INTEGER NOT NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT true,
  `required_permission` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `module_registry_key_key`(`key`),
  INDEX `module_registry_is_enabled_sort_order_idx`(`is_enabled`, `sort_order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
