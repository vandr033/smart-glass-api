-- CreateTable
CREATE TABLE `profile_optimization_runs` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `quotation_id` CHAR(36) NULL,
    `project_id` CHAR(36) NULL,
    `status` ENUM('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `mode` ENUM('COMMERCIAL_ESTIMATION', 'OPERATIONAL_EXECUTION') NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `total_required_length_mm` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_bar_length_mm` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_waste_length_mm` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `waste_percent` DECIMAL(9, 4) NOT NULL DEFAULT 0,
    `input_json` JSON NOT NULL,
    `result_json` JSON NULL,
    `created_by_user_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profile_optimization_runs_code_key`(`code`),
    INDEX `profile_optimization_runs_quotation_id_created_at_idx`(`quotation_id`, `created_at`),
    INDEX `profile_optimization_runs_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `profile_optimization_runs_material_id_created_at_idx`(`material_id`, `created_at`),
    INDEX `profile_optimization_runs_status_created_at_idx`(`status`, `created_at`),
    INDEX `profile_optimization_runs_mode_created_at_idx`(`mode`, `created_at`),
    INDEX `profile_optimization_runs_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_cutting_plans` (
    `id` CHAR(36) NOT NULL,
    `optimization_run_id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'SENT_TO_PRODUCTION', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `total_bars` INTEGER NOT NULL DEFAULT 0,
    `total_required_length_mm` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_waste_length_mm` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `waste_percent` DECIMAL(9, 4) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profile_cutting_plans_code_key`(`code`),
    INDEX `profile_cutting_plans_optimization_run_id_created_at_idx`(`optimization_run_id`, `created_at`),
    INDEX `profile_cutting_plans_material_id_created_at_idx`(`material_id`, `created_at`),
    INDEX `profile_cutting_plans_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_cutting_bars` (
    `id` CHAR(36) NOT NULL,
    `cutting_plan_id` CHAR(36) NOT NULL,
    `inventory_stock_id` CHAR(36) NULL,
    `remnant_piece_id` CHAR(36) NULL,
    `source_type` ENUM('INVENTORY_BAR', 'REMNANT', 'PURCHASE_REQUIRED', 'VIRTUAL') NOT NULL,
    `original_length_mm` DECIMAL(14, 2) NOT NULL,
    `used_length_mm` DECIMAL(14, 2) NOT NULL,
    `waste_length_mm` DECIMAL(14, 2) NOT NULL,
    `waste_percent` DECIMAL(9, 4) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `profile_cutting_bars_cutting_plan_id_sort_order_idx`(`cutting_plan_id`, `sort_order`),
    INDEX `profile_cutting_bars_inventory_stock_id_idx`(`inventory_stock_id`),
    INDEX `profile_cutting_bars_remnant_piece_id_idx`(`remnant_piece_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_cut_pieces` (
    `id` CHAR(36) NOT NULL,
    `cutting_bar_id` CHAR(36) NOT NULL,
    `quotation_item_id` CHAR(36) NULL,
    `material_id` CHAR(36) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `length_mm` DECIMAL(14, 2) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `position_mm` DECIMAL(14, 2) NOT NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `profile_cut_pieces_cutting_bar_id_idx`(`cutting_bar_id`),
    INDEX `profile_cut_pieces_quotation_item_id_idx`(`quotation_item_id`),
    INDEX `profile_cut_pieces_material_id_idx`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_remnant_outputs` (
    `id` CHAR(36) NOT NULL,
    `cutting_bar_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `remaining_length_mm` DECIMAL(14, 2) NOT NULL,
    `should_create_remnant` BOOLEAN NOT NULL DEFAULT true,
    `remnant_piece_id` CHAR(36) NULL,
    `status` ENUM('PLANNED', 'CREATED', 'DISCARDED') NOT NULL DEFAULT 'PLANNED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `profile_remnant_outputs_cutting_bar_id_idx`(`cutting_bar_id`),
    INDEX `profile_remnant_outputs_material_id_idx`(`material_id`),
    INDEX `profile_remnant_outputs_remnant_piece_id_idx`(`remnant_piece_id`),
    INDEX `profile_remnant_outputs_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile_optimization_runs` ADD CONSTRAINT `profile_optimization_runs_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_optimization_runs` ADD CONSTRAINT `profile_optimization_runs_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_optimization_runs` ADD CONSTRAINT `profile_optimization_runs_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_optimization_runs` ADD CONSTRAINT `profile_optimization_runs_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_cutting_plans` ADD CONSTRAINT `profile_cutting_plans_optimization_run_id_fkey` FOREIGN KEY (`optimization_run_id`) REFERENCES `profile_optimization_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_cutting_plans` ADD CONSTRAINT `profile_cutting_plans_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_cutting_bars` ADD CONSTRAINT `profile_cutting_bars_cutting_plan_id_fkey` FOREIGN KEY (`cutting_plan_id`) REFERENCES `profile_cutting_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_cutting_bars` ADD CONSTRAINT `profile_cutting_bars_inventory_stock_id_fkey` FOREIGN KEY (`inventory_stock_id`) REFERENCES `inventory_stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_cutting_bars` ADD CONSTRAINT `profile_cutting_bars_remnant_piece_id_fkey` FOREIGN KEY (`remnant_piece_id`) REFERENCES `remnant_pieces`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_cut_pieces` ADD CONSTRAINT `profile_cut_pieces_cutting_bar_id_fkey` FOREIGN KEY (`cutting_bar_id`) REFERENCES `profile_cutting_bars`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_cut_pieces` ADD CONSTRAINT `profile_cut_pieces_quotation_item_id_fkey` FOREIGN KEY (`quotation_item_id`) REFERENCES `quotation_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_cut_pieces` ADD CONSTRAINT `profile_cut_pieces_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_remnant_outputs` ADD CONSTRAINT `profile_remnant_outputs_cutting_bar_id_fkey` FOREIGN KEY (`cutting_bar_id`) REFERENCES `profile_cutting_bars`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_remnant_outputs` ADD CONSTRAINT `profile_remnant_outputs_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_remnant_outputs` ADD CONSTRAINT `profile_remnant_outputs_remnant_piece_id_fkey` FOREIGN KEY (`remnant_piece_id`) REFERENCES `remnant_pieces`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
