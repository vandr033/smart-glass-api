-- CreateTable
CREATE TABLE `product_templates` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `product_type` ENUM('WINDOW', 'DOOR', 'SHOWER', 'FACADE', 'RAILING', 'MIRROR', 'CUSTOM', 'SERVICE') NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `current_version_id` CHAR(36) NULL,
    `created_by_user_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `product_templates_code_key`(`code`),
    UNIQUE INDEX `product_templates_current_version_id_key`(`current_version_id`),
    INDEX `product_templates_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `product_templates_product_type_deleted_at_idx`(`product_type`, `deleted_at`),
    INDEX `product_templates_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `product_templates_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_template_versions` (
    `id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) NOT NULL,
    `version_number` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `input_schema_json` JSON NOT NULL,
    `calculation_rules_json` JSON NULL,
    `default_margin_percent` DECIMAL(5, 2) NULL,
    `default_waste_percent` DECIMAL(5, 2) NULL,
    `labor_rules_json` JSON NULL,
    `installation_rules_json` JSON NULL,
    `notes` TEXT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `activated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_template_versions_template_id_status_idx`(`template_id`, `status`),
    INDEX `product_template_versions_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `product_template_versions_activated_at_idx`(`activated_at`),
    UNIQUE INDEX `product_template_versions_template_id_version_number_key`(`template_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_template_inputs` (
    `id` CHAR(36) NOT NULL,
    `version_id` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `input_type` ENUM('NUMBER', 'TEXT', 'SELECT', 'BOOLEAN', 'MATERIAL_SELECT') NOT NULL,
    `unit` VARCHAR(50) NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT false,
    `default_value_json` JSON NULL,
    `options_json` JSON NULL,
    `validation_json` JSON NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_template_inputs_version_id_sort_order_idx`(`version_id`, `sort_order`),
    UNIQUE INDEX `product_template_inputs_version_id_key_key`(`version_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_template_material_rules` (
    `id` CHAR(36) NOT NULL,
    `version_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `rule_type` ENUM('LINEAR_CUT', 'SHEET_CUT', 'UNIT_QUANTITY', 'PACKAGE_QUANTITY', 'SERVICE_COST') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `formula_json` JSON NOT NULL,
    `waste_percent` DECIMAL(5, 2) NULL,
    `allow_remnant_use` BOOLEAN NOT NULL DEFAULT true,
    `allow_rotation` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_template_material_rules_version_id_sort_order_idx`(`version_id`, `sort_order`),
    INDEX `product_template_material_rules_material_id_idx`(`material_id`),
    INDEX `product_template_material_rules_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_template_accessory_rules` (
    `id` CHAR(36) NOT NULL,
    `version_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `quantity_formula_json` JSON NOT NULL,
    `is_optional` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_template_accessory_rules_version_id_sort_order_idx`(`version_id`, `sort_order`),
    INDEX `product_template_accessory_rules_material_id_idx`(`material_id`),
    INDEX `product_template_accessory_rules_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_template_labor_rules` (
    `id` CHAR(36) NOT NULL,
    `version_id` CHAR(36) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `labor_type` ENUM('FABRICATION', 'INSTALLATION', 'TRANSPORT', 'OTHER') NOT NULL,
    `formula_json` JSON NOT NULL,
    `unit_cost` DECIMAL(14, 4) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_template_labor_rules_version_id_sort_order_idx`(`version_id`, `sort_order`),
    INDEX `product_template_labor_rules_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_template_simulations` (
    `id` CHAR(36) NOT NULL,
    `version_id` CHAR(36) NOT NULL,
    `simulated_by_user_id` CHAR(36) NULL,
    `input_values_json` JSON NOT NULL,
    `result_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_template_simulations_version_id_created_at_idx`(`version_id`, `created_at`),
    INDEX `product_template_simulations_simulated_by_user_id_idx`(`simulated_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_templates` ADD CONSTRAINT `product_templates_current_version_id_fkey` FOREIGN KEY (`current_version_id`) REFERENCES `product_template_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_templates` ADD CONSTRAINT `product_templates_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_versions` ADD CONSTRAINT `product_template_versions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `product_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_versions` ADD CONSTRAINT `product_template_versions_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_inputs` ADD CONSTRAINT `product_template_inputs_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `product_template_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_material_rules` ADD CONSTRAINT `product_template_material_rules_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `product_template_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_material_rules` ADD CONSTRAINT `product_template_material_rules_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_accessory_rules` ADD CONSTRAINT `product_template_accessory_rules_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `product_template_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_accessory_rules` ADD CONSTRAINT `product_template_accessory_rules_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_labor_rules` ADD CONSTRAINT `product_template_labor_rules_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `product_template_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_simulations` ADD CONSTRAINT `product_template_simulations_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `product_template_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_simulations` ADD CONSTRAINT `product_template_simulations_simulated_by_user_id_fkey` FOREIGN KEY (`simulated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
