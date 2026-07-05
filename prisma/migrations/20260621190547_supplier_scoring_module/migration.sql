-- CreateTable
CREATE TABLE `suppliers` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NULL,
    `legal_name` VARCHAR(191) NOT NULL,
    `commercial_name` VARCHAR(191) NULL,
    `tax_id` VARCHAR(100) NULL,
    `phone` VARCHAR(50) NULL,
    `whatsapp` VARCHAR(50) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `country` VARCHAR(100) NOT NULL DEFAULT 'Bolivia',
    `contact_name` VARCHAR(191) NULL,
    `contact_position` VARCHAR(191) NULL,
    `contact_phone` VARCHAR(50) NULL,
    `contact_email` VARCHAR(191) NULL,
    `payment_terms` VARCHAR(255) NULL,
    `credit_available` BOOLEAN NOT NULL DEFAULT false,
    `credit_limit` DECIMAL(14, 2) NULL,
    `default_lead_time_days` INTEGER NULL,
    `reliability_score` DECIMAL(5, 2) NULL,
    `preference_score` DECIMAL(5, 2) NULL,
    `notes` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `suppliers_code_key`(`code`),
    INDEX `suppliers_deleted_at_idx`(`deleted_at`),
    INDEX `suppliers_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `suppliers_legal_name_deleted_at_idx`(`legal_name`, `deleted_at`),
    INDEX `suppliers_commercial_name_deleted_at_idx`(`commercial_name`, `deleted_at`),
    INDEX `suppliers_tax_id_deleted_at_idx`(`tax_id`, `deleted_at`),
    INDEX `suppliers_email_deleted_at_idx`(`email`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_categories` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supplier_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_category_assignments` (
    `id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supplier_category_assignments_category_id_idx`(`category_id`),
    UNIQUE INDEX `supplier_category_assignments_supplier_id_category_id_key`(`supplier_id`, `category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_contacts` (
    `id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NULL,
    `phone` VARCHAR(50) NULL,
    `whatsapp` VARCHAR(50) NULL,
    `email` VARCHAR(191) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_contacts_supplier_id_is_primary_idx`(`supplier_id`, `is_primary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_scoring_criteria` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supplier_scoring_criteria_key_key`(`key`),
    INDEX `supplier_scoring_criteria_is_enabled_sort_order_idx`(`is_enabled`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_scoring_configs` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scope` ENUM('GLOBAL', 'CATEGORY') NOT NULL,
    `category_id` CHAR(36) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_scoring_configs_scope_is_active_is_default_idx`(`scope`, `is_active`, `is_default`),
    INDEX `supplier_scoring_configs_category_id_is_active_idx`(`category_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_scoring_config_weights` (
    `id` CHAR(36) NOT NULL,
    `config_id` CHAR(36) NOT NULL,
    `criterion_id` CHAR(36) NOT NULL,
    `weight` DECIMAL(5, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supplier_scoring_config_weights_criterion_id_idx`(`criterion_id`),
    UNIQUE INDEX `supplier_scoring_config_weights_config_id_criterion_id_key`(`config_id`, `criterion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `supplier_category_assignments` ADD CONSTRAINT `supplier_category_assignments_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_category_assignments` ADD CONSTRAINT `supplier_category_assignments_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `supplier_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_contacts` ADD CONSTRAINT `supplier_contacts_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_scoring_configs` ADD CONSTRAINT `supplier_scoring_configs_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `supplier_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_scoring_config_weights` ADD CONSTRAINT `supplier_scoring_config_weights_config_id_fkey` FOREIGN KEY (`config_id`) REFERENCES `supplier_scoring_configs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_scoring_config_weights` ADD CONSTRAINT `supplier_scoring_config_weights_criterion_id_fkey` FOREIGN KEY (`criterion_id`) REFERENCES `supplier_scoring_criteria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
