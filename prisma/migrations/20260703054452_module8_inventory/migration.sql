-- CreateTable
CREATE TABLE `warehouses` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `address` VARCHAR(255) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `warehouses_code_key`(`code`),
    INDEX `warehouses_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `warehouses_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_stocks` (
    `id` CHAR(36) NOT NULL,
    `warehouse_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `stock_type` ENUM('STANDARD', 'REMNANT', 'DAMAGED', 'RESERVED', 'QUARANTINE') NOT NULL DEFAULT 'STANDARD',
    `quantity` DECIMAL(14, 4) NOT NULL,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `length_mm` DECIMAL(14, 2) NULL,
    `width_mm` DECIMAL(14, 2) NULL,
    `height_mm` DECIMAL(14, 2) NULL,
    `thickness_mm` DECIMAL(14, 2) NULL,
    `batch_number` VARCHAR(100) NULL,
    `location_code` VARCHAR(100) NULL,
    `condition` ENUM('AVAILABLE', 'RESERVED_SOFT', 'RESERVED_FIRM', 'DAMAGED', 'CONSUMED', 'SCRAPPED') NOT NULL DEFAULT 'AVAILABLE',
    `source_type` ENUM('MANUAL', 'PURCHASE', 'REMNANT_GENERATED', 'RETURN', 'ADJUSTMENT') NOT NULL DEFAULT 'MANUAL',
    `source_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `inventory_stocks_warehouse_id_material_id_stock_type_deleted_idx`(`warehouse_id`, `material_id`, `stock_type`, `deleted_at`),
    INDEX `inventory_stocks_material_id_condition_deleted_at_idx`(`material_id`, `condition`, `deleted_at`),
    INDEX `inventory_stocks_source_id_idx`(`source_id`),
    INDEX `inventory_stocks_location_code_idx`(`location_code`),
    INDEX `inventory_stocks_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` CHAR(36) NOT NULL,
    `warehouse_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `inventory_stock_id` CHAR(36) NULL,
    `movement_type` ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RESERVATION_SOFT', 'RESERVATION_FIRM', 'RESERVATION_RELEASE', 'DAMAGE', 'SCRAP') NOT NULL,
    `quantity` DECIMAL(14, 4) NOT NULL,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `from_warehouse_id` CHAR(36) NULL,
    `to_warehouse_id` CHAR(36) NULL,
    `reference_type` VARCHAR(100) NULL,
    `reference_id` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_movements_warehouse_id_created_at_idx`(`warehouse_id`, `created_at`),
    INDEX `inventory_movements_material_id_created_at_idx`(`material_id`, `created_at`),
    INDEX `inventory_movements_inventory_stock_id_created_at_idx`(`inventory_stock_id`, `created_at`),
    INDEX `inventory_movements_movement_type_created_at_idx`(`movement_type`, `created_at`),
    INDEX `inventory_movements_from_warehouse_id_idx`(`from_warehouse_id`),
    INDEX `inventory_movements_to_warehouse_id_idx`(`to_warehouse_id`),
    INDEX `inventory_movements_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `inventory_movements_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_reservations` (
    `id` CHAR(36) NOT NULL,
    `quotation_id` CHAR(36) NULL,
    `project_id` CHAR(36) NULL,
    `warehouse_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `inventory_stock_id` CHAR(36) NULL,
    `reservation_type` ENUM('SOFT', 'FIRM') NOT NULL,
    `status` ENUM('ACTIVE', 'RELEASED', 'CONSUMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `quantity` DECIMAL(14, 4) NOT NULL,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `reserved_by_user_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `inventory_reservations_quotation_id_status_idx`(`quotation_id`, `status`),
    INDEX `inventory_reservations_project_id_status_idx`(`project_id`, `status`),
    INDEX `inventory_reservations_warehouse_id_status_idx`(`warehouse_id`, `status`),
    INDEX `inventory_reservations_material_id_status_idx`(`material_id`, `status`),
    INDEX `inventory_reservations_inventory_stock_id_status_idx`(`inventory_stock_id`, `status`),
    INDEX `inventory_reservations_expires_at_status_idx`(`expires_at`, `status`),
    INDEX `inventory_reservations_reserved_by_user_id_idx`(`reserved_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remnant_pieces` (
    `id` CHAR(36) NOT NULL,
    `warehouse_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `parent_inventory_stock_id` CHAR(36) NULL,
    `code` VARCHAR(100) NOT NULL,
    `length_mm` DECIMAL(14, 2) NULL,
    `width_mm` DECIMAL(14, 2) NULL,
    `thickness_mm` DECIMAL(14, 2) NULL,
    `quantity` DECIMAL(14, 4) NOT NULL DEFAULT 1,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `usable_area_m2` DECIMAL(14, 4) NULL,
    `status` ENUM('AVAILABLE', 'RESERVED', 'CONSUMED', 'SCRAPPED') NOT NULL DEFAULT 'AVAILABLE',
    `source_type` ENUM('MANUAL', 'CUT_OPTIMIZATION', 'PRODUCTION_RETURN') NOT NULL DEFAULT 'MANUAL',
    `source_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `remnant_pieces_code_key`(`code`),
    INDEX `remnant_pieces_warehouse_id_status_idx`(`warehouse_id`, `status`),
    INDEX `remnant_pieces_material_id_status_idx`(`material_id`, `status`),
    INDEX `remnant_pieces_parent_inventory_stock_id_idx`(`parent_inventory_stock_id`),
    INDEX `remnant_pieces_thickness_mm_status_idx`(`thickness_mm`, `status`),
    INDEX `remnant_pieces_usable_area_m2_status_idx`(`usable_area_m2`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `damaged_materials` (
    `id` CHAR(36) NOT NULL,
    `warehouse_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `inventory_stock_id` CHAR(36) NULL,
    `quantity` DECIMAL(14, 4) NOT NULL,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `damage_type` ENUM('BROKEN', 'SCRATCHED', 'BENT', 'MISSING_PARTS', 'OTHER') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'TOTAL_LOSS') NOT NULL,
    `description` TEXT NULL,
    `reported_by_user_id` CHAR(36) NULL,
    `status` ENUM('REPORTED', 'REVIEWED', 'SCRAPPED', 'REUSABLE', 'RETURNED_TO_SUPPLIER') NOT NULL DEFAULT 'REPORTED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `damaged_materials_warehouse_id_status_idx`(`warehouse_id`, `status`),
    INDEX `damaged_materials_material_id_status_idx`(`material_id`, `status`),
    INDEX `damaged_materials_inventory_stock_id_idx`(`inventory_stock_id`),
    INDEX `damaged_materials_reported_by_user_id_idx`(`reported_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventory_stocks` ADD CONSTRAINT `inventory_stocks_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_stocks` ADD CONSTRAINT `inventory_stocks_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_inventory_stock_id_fkey` FOREIGN KEY (`inventory_stock_id`) REFERENCES `inventory_stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_from_warehouse_id_fkey` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_to_warehouse_id_fkey` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_inventory_stock_id_fkey` FOREIGN KEY (`inventory_stock_id`) REFERENCES `inventory_stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_reserved_by_user_id_fkey` FOREIGN KEY (`reserved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remnant_pieces` ADD CONSTRAINT `remnant_pieces_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remnant_pieces` ADD CONSTRAINT `remnant_pieces_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remnant_pieces` ADD CONSTRAINT `remnant_pieces_parent_inventory_stock_id_fkey` FOREIGN KEY (`parent_inventory_stock_id`) REFERENCES `inventory_stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damaged_materials` ADD CONSTRAINT `damaged_materials_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damaged_materials` ADD CONSTRAINT `damaged_materials_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damaged_materials` ADD CONSTRAINT `damaged_materials_inventory_stock_id_fkey` FOREIGN KEY (`inventory_stock_id`) REFERENCES `inventory_stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `damaged_materials` ADD CONSTRAINT `damaged_materials_reported_by_user_id_fkey` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
