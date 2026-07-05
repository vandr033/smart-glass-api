-- CreateTable
CREATE TABLE `price_list_imports` (
    `id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(255) NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NULL,
    `status` ENUM('UPLOADED', 'PARSED', 'NEEDS_MAPPING', 'VALIDATED', 'APPROVED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'UPLOADED',
    `source_type` ENUM('EXCEL', 'CSV') NOT NULL,
    `currency` VARCHAR(16) NOT NULL DEFAULT 'BOB',
    `imported_by_user_id` CHAR(36) NOT NULL,
    `approved_by_user_id` CHAR(36) NULL,
    `approved_at` DATETIME(3) NULL,
    `error_message` TEXT NULL,
    `row_count` INTEGER NOT NULL DEFAULT 0,
    `mapped_count` INTEGER NOT NULL DEFAULT 0,
    `unmapped_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `price_list_imports_supplier_id_created_at_idx`(`supplier_id`, `created_at`),
    INDEX `price_list_imports_status_created_at_idx`(`status`, `created_at`),
    INDEX `price_list_imports_imported_by_user_id_idx`(`imported_by_user_id`),
    INDEX `price_list_imports_approved_by_user_id_idx`(`approved_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_list_import_rows` (
    `id` CHAR(36) NOT NULL,
    `import_id` CHAR(36) NOT NULL,
    `row_number` INTEGER NOT NULL,
    `raw_json` JSON NOT NULL,
    `supplier_sku` VARCHAR(100) NULL,
    `supplier_name` VARCHAR(191) NOT NULL,
    `supplier_description` TEXT NULL,
    `supplier_unit` VARCHAR(50) NULL,
    `raw_price` VARCHAR(100) NULL,
    `normalized_price` DECIMAL(14, 4) NULL,
    `currency` VARCHAR(16) NULL,
    `detected_material_id` CHAR(36) NULL,
    `supplier_material_equivalence_id` CHAR(36) NULL,
    `mapping_status` ENUM('UNMAPPED', 'AUTO_MAPPED', 'MANUAL_MAPPED', 'IGNORED', 'ERROR') NOT NULL DEFAULT 'UNMAPPED',
    `validation_status` ENUM('PENDING', 'VALID', 'INVALID') NOT NULL DEFAULT 'PENDING',
    `validation_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `price_list_import_rows_import_id_row_number_idx`(`import_id`, `row_number`),
    INDEX `price_list_import_rows_import_id_mapping_status_idx`(`import_id`, `mapping_status`),
    INDEX `price_list_import_rows_import_id_validation_status_idx`(`import_id`, `validation_status`),
    INDEX `price_list_import_rows_detected_material_id_idx`(`detected_material_id`),
    INDEX `price_list_import_rows_supplier_material_equivalence_id_idx`(`supplier_material_equivalence_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_material_prices` (
    `id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `supplier_material_equivalence_id` CHAR(36) NULL,
    `import_id` CHAR(36) NULL,
    `price` DECIMAL(14, 4) NOT NULL,
    `currency` VARCHAR(16) NOT NULL DEFAULT 'BOB',
    `supplier_unit` VARCHAR(50) NULL,
    `normalized_unit` VARCHAR(50) NULL,
    `conversion_factor` DECIMAL(14, 6) NULL,
    `effective_from` DATETIME(3) NOT NULL,
    `effective_to` DATETIME(3) NULL,
    `is_current` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_material_prices_supplier_id_material_id_is_current_idx`(`supplier_id`, `material_id`, `is_current`),
    INDEX `supplier_material_prices_material_id_is_current_idx`(`material_id`, `is_current`),
    INDEX `supplier_material_prices_import_id_idx`(`import_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_change_logs` (
    `id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `old_price` DECIMAL(14, 4) NULL,
    `new_price` DECIMAL(14, 4) NOT NULL,
    `old_currency` VARCHAR(16) NULL,
    `new_currency` VARCHAR(16) NOT NULL,
    `change_percent` DECIMAL(9, 4) NULL,
    `import_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `price_change_logs_supplier_id_material_id_created_at_idx`(`supplier_id`, `material_id`, `created_at`),
    INDEX `price_change_logs_import_id_idx`(`import_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `price_list_imports` ADD CONSTRAINT `price_list_imports_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_list_imports` ADD CONSTRAINT `price_list_imports_imported_by_user_id_fkey` FOREIGN KEY (`imported_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_list_imports` ADD CONSTRAINT `price_list_imports_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_list_import_rows` ADD CONSTRAINT `price_list_import_rows_import_id_fkey` FOREIGN KEY (`import_id`) REFERENCES `price_list_imports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_list_import_rows` ADD CONSTRAINT `price_list_import_rows_detected_material_id_fkey` FOREIGN KEY (`detected_material_id`) REFERENCES `materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_list_import_rows` ADD CONSTRAINT `price_list_import_rows_supplier_material_equivalence_id_fkey` FOREIGN KEY (`supplier_material_equivalence_id`) REFERENCES `supplier_material_equivalences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_material_prices` ADD CONSTRAINT `supplier_material_prices_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_material_prices` ADD CONSTRAINT `supplier_material_prices_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_material_prices` ADD CONSTRAINT `supplier_material_prices_supplier_material_equivalence_id_fkey` FOREIGN KEY (`supplier_material_equivalence_id`) REFERENCES `supplier_material_equivalences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_material_prices` ADD CONSTRAINT `supplier_material_prices_import_id_fkey` FOREIGN KEY (`import_id`) REFERENCES `price_list_imports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_change_logs` ADD CONSTRAINT `price_change_logs_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_change_logs` ADD CONSTRAINT `price_change_logs_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_change_logs` ADD CONSTRAINT `price_change_logs_import_id_fkey` FOREIGN KEY (`import_id`) REFERENCES `price_list_imports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
