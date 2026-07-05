-- CreateTable
CREATE TABLE `material_categories` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(255) NULL,
    `parent_id` CHAR(36) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `material_categories_name_key`(`name`),
    UNIQUE INDEX `material_categories_slug_key`(`slug`),
    INDEX `material_categories_parent_id_sort_order_idx`(`parent_id`, `sort_order`),
    INDEX `material_categories_is_active_sort_order_idx`(`is_active`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materials` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category_id` CHAR(36) NOT NULL,
    `material_type` ENUM('LINEAR', 'SHEET', 'UNIT', 'PACKAGE', 'SERVICE') NOT NULL,
    `base_unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `purchase_unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `stock_unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `consumption_unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `unit_conversion_json` JSON NULL,
    `is_stockable` BOOLEAN NOT NULL DEFAULT true,
    `is_purchasable` BOOLEAN NOT NULL DEFAULT true,
    `is_sellable` BOOLEAN NOT NULL DEFAULT false,
    `is_cuttable` BOOLEAN NOT NULL DEFAULT false,
    `is_remnant_eligible` BOOLEAN NOT NULL DEFAULT false,
    `allows_rotation` BOOLEAN NOT NULL DEFAULT false,
    `default_waste_percent` DECIMAL(5, 2) NULL,
    `minimum_reusable_length_mm` DECIMAL(14, 2) NULL,
    `minimum_reusable_width_mm` DECIMAL(14, 2) NULL,
    `minimum_reusable_height_mm` DECIMAL(14, 2) NULL,
    `standard_length_mm` DECIMAL(14, 2) NULL,
    `standard_width_mm` DECIMAL(14, 2) NULL,
    `standard_height_mm` DECIMAL(14, 2) NULL,
    `thickness_mm` DECIMAL(14, 2) NULL,
    `color` VARCHAR(191) NULL,
    `finish` VARCHAR(191) NULL,
    `brand` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `materials_code_key`(`code`),
    INDEX `materials_category_id_deleted_at_idx`(`category_id`, `deleted_at`),
    INDEX `materials_material_type_status_deleted_at_idx`(`material_type`, `status`, `deleted_at`),
    INDEX `materials_name_deleted_at_idx`(`name`, `deleted_at`),
    INDEX `materials_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_dimension_presets` (
    `id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `length_mm` DECIMAL(14, 2) NULL,
    `width_mm` DECIMAL(14, 2) NULL,
    `height_mm` DECIMAL(14, 2) NULL,
    `thickness_mm` DECIMAL(14, 2) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `material_dimension_presets_material_id_is_default_idx`(`material_id`, `is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_material_equivalences` (
    `id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NULL,
    `supplier_sku` VARCHAR(100) NULL,
    `supplier_name` VARCHAR(191) NOT NULL,
    `supplier_description` TEXT NULL,
    `supplier_unit` VARCHAR(50) NULL,
    `conversion_factor` DECIMAL(14, 6) NULL,
    `confidence` ENUM('PENDING', 'LOW', 'MEDIUM', 'HIGH', 'VERIFIED') NOT NULL DEFAULT 'PENDING',
    `status` ENUM('ACTIVE', 'INACTIVE', 'IGNORED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_material_equivalences_supplier_id_status_idx`(`supplier_id`, `status`),
    INDEX `supplier_material_equivalences_material_id_status_idx`(`material_id`, `status`),
    INDEX `supplier_material_equivalences_confidence_status_idx`(`confidence`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_attachments` (
    `id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `material_attachments_material_id_idx`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `material_categories` ADD CONSTRAINT `material_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `material_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `material_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_dimension_presets` ADD CONSTRAINT `material_dimension_presets_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_material_equivalences` ADD CONSTRAINT `supplier_material_equivalences_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_material_equivalences` ADD CONSTRAINT `supplier_material_equivalences_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_attachments` ADD CONSTRAINT `material_attachments_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
