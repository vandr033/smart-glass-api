-- CreateTable
CREATE TABLE `production_jobs` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `quotation_id` CHAR(36) NULL,
    `project_id` CHAR(36) NULL,
    `cutting_plan_id` CHAR(36) NULL,
    `status` ENUM('DRAFT', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `planned_start_date` DATETIME(3) NULL,
    `planned_end_date` DATETIME(3) NULL,
    `actual_start_date` DATETIME(3) NULL,
    `actual_end_date` DATETIME(3) NULL,
    `assigned_to_user_id` CHAR(36) NULL,
    `created_by_user_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `production_jobs_code_key`(`code`),
    INDEX `production_jobs_quotation_id_deleted_at_idx`(`quotation_id`, `deleted_at`),
    INDEX `production_jobs_project_id_deleted_at_idx`(`project_id`, `deleted_at`),
    INDEX `production_jobs_cutting_plan_id_deleted_at_idx`(`cutting_plan_id`, `deleted_at`),
    INDEX `production_jobs_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `production_jobs_priority_deleted_at_idx`(`priority`, `deleted_at`),
    INDEX `production_jobs_assigned_to_user_id_deleted_at_idx`(`assigned_to_user_id`, `deleted_at`),
    INDEX `production_jobs_planned_start_date_deleted_at_idx`(`planned_start_date`, `deleted_at`),
    INDEX `production_jobs_planned_end_date_deleted_at_idx`(`planned_end_date`, `deleted_at`),
    INDEX `production_jobs_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_job_items` (
    `id` CHAR(36) NOT NULL,
    `production_job_id` CHAR(36) NOT NULL,
    `quotation_item_id` CHAR(36) NULL,
    `material_id` CHAR(36) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(14, 4) NOT NULL DEFAULT 1,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `production_job_items_production_job_id_status_idx`(`production_job_id`, `status`),
    INDEX `production_job_items_quotation_item_id_idx`(`quotation_item_id`),
    INDEX `production_job_items_material_id_idx`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_tasks` (
    `id` CHAR(36) NOT NULL,
    `production_job_id` CHAR(36) NOT NULL,
    `production_job_item_id` CHAR(36) NULL,
    `task_type` ENUM('MEASURE', 'CUT_GLASS', 'CUT_PROFILE', 'ASSEMBLE', 'QUALITY_CHECK', 'PACK', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `assigned_to_user_id` CHAR(36) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `production_tasks_production_job_id_sort_order_idx`(`production_job_id`, `sort_order`),
    INDEX `production_tasks_production_job_item_id_idx`(`production_job_item_id`),
    INDEX `production_tasks_assigned_to_user_id_status_idx`(`assigned_to_user_id`, `status`),
    INDEX `production_tasks_task_type_status_idx`(`task_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_consumptions` (
    `id` CHAR(36) NOT NULL,
    `production_job_id` CHAR(36) NOT NULL,
    `production_task_id` CHAR(36) NULL,
    `inventory_stock_id` CHAR(36) NULL,
    `remnant_piece_id` CHAR(36) NULL,
    `material_id` CHAR(36) NOT NULL,
    `quantity` DECIMAL(14, 4) NOT NULL,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `consumption_type` ENUM('PLANNED', 'ACTUAL', 'WASTE', 'SCRAP', 'REMNANT_OUTPUT') NOT NULL,
    `source_type` ENUM('INVENTORY_STOCK', 'REMNANT', 'MANUAL') NOT NULL,
    `notes` TEXT NULL,
    `consumed_by_user_id` CHAR(36) NULL,
    `consumed_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `material_consumptions_production_job_id_consumed_at_idx`(`production_job_id`, `consumed_at`),
    INDEX `material_consumptions_production_task_id_consumed_at_idx`(`production_task_id`, `consumed_at`),
    INDEX `material_consumptions_inventory_stock_id_idx`(`inventory_stock_id`),
    INDEX `material_consumptions_remnant_piece_id_idx`(`remnant_piece_id`),
    INDEX `material_consumptions_material_id_consumption_type_consumed__idx`(`material_id`, `consumption_type`, `consumed_at`),
    INDEX `material_consumptions_consumed_by_user_id_idx`(`consumed_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_waste_reports` (
    `id` CHAR(36) NOT NULL,
    `production_job_id` CHAR(36) NOT NULL,
    `cutting_plan_id` CHAR(36) NULL,
    `theoretical_waste_area_m2` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `actual_waste_area_m2` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `theoretical_waste_percent` DECIMAL(9, 4) NOT NULL DEFAULT 0,
    `actual_waste_percent` DECIMAL(9, 4) NOT NULL DEFAULT 0,
    `variance_area_m2` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `variance_percent` DECIMAL(9, 4) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `production_waste_reports_production_job_id_created_at_idx`(`production_job_id`, `created_at`),
    INDEX `production_waste_reports_cutting_plan_id_created_at_idx`(`cutting_plan_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_status_history` (
    `id` CHAR(36) NOT NULL,
    `production_job_id` CHAR(36) NOT NULL,
    `from_status` ENUM('DRAFT', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED') NULL,
    `to_status` ENUM('DRAFT', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED') NOT NULL,
    `changed_by_user_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `production_status_history_production_job_id_created_at_idx`(`production_job_id`, `created_at`),
    INDEX `production_status_history_changed_by_user_id_idx`(`changed_by_user_id`),
    INDEX `production_status_history_to_status_created_at_idx`(`to_status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_checks` (
    `id` CHAR(36) NOT NULL,
    `production_job_id` CHAR(36) NOT NULL,
    `production_task_id` CHAR(36) NULL,
    `status` ENUM('PENDING', 'PASSED', 'FAILED', 'REWORK_REQUIRED') NOT NULL DEFAULT 'PENDING',
    `checked_by_user_id` CHAR(36) NULL,
    `checked_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `evidence_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quality_checks_production_job_id_created_at_idx`(`production_job_id`, `created_at`),
    INDEX `quality_checks_production_task_id_created_at_idx`(`production_task_id`, `created_at`),
    INDEX `quality_checks_checked_by_user_id_idx`(`checked_by_user_id`),
    INDEX `quality_checks_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_jobs` ADD CONSTRAINT `production_jobs_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_jobs` ADD CONSTRAINT `production_jobs_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_jobs` ADD CONSTRAINT `production_jobs_cutting_plan_id_fkey` FOREIGN KEY (`cutting_plan_id`) REFERENCES `cutting_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_jobs` ADD CONSTRAINT `production_jobs_assigned_to_user_id_fkey` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_jobs` ADD CONSTRAINT `production_jobs_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_job_items` ADD CONSTRAINT `production_job_items_production_job_id_fkey` FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_job_items` ADD CONSTRAINT `production_job_items_quotation_item_id_fkey` FOREIGN KEY (`quotation_item_id`) REFERENCES `quotation_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_job_items` ADD CONSTRAINT `production_job_items_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_tasks` ADD CONSTRAINT `production_tasks_production_job_id_fkey` FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_tasks` ADD CONSTRAINT `production_tasks_production_job_item_id_fkey` FOREIGN KEY (`production_job_item_id`) REFERENCES `production_job_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_tasks` ADD CONSTRAINT `production_tasks_assigned_to_user_id_fkey` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_consumptions` ADD CONSTRAINT `material_consumptions_production_job_id_fkey` FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_consumptions` ADD CONSTRAINT `material_consumptions_production_task_id_fkey` FOREIGN KEY (`production_task_id`) REFERENCES `production_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_consumptions` ADD CONSTRAINT `material_consumptions_inventory_stock_id_fkey` FOREIGN KEY (`inventory_stock_id`) REFERENCES `inventory_stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_consumptions` ADD CONSTRAINT `material_consumptions_remnant_piece_id_fkey` FOREIGN KEY (`remnant_piece_id`) REFERENCES `remnant_pieces`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_consumptions` ADD CONSTRAINT `material_consumptions_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_consumptions` ADD CONSTRAINT `material_consumptions_consumed_by_user_id_fkey` FOREIGN KEY (`consumed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_waste_reports` ADD CONSTRAINT `production_waste_reports_production_job_id_fkey` FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_waste_reports` ADD CONSTRAINT `production_waste_reports_cutting_plan_id_fkey` FOREIGN KEY (`cutting_plan_id`) REFERENCES `cutting_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_status_history` ADD CONSTRAINT `production_status_history_production_job_id_fkey` FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_status_history` ADD CONSTRAINT `production_status_history_changed_by_user_id_fkey` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_checks` ADD CONSTRAINT `quality_checks_production_job_id_fkey` FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_checks` ADD CONSTRAINT `quality_checks_production_task_id_fkey` FOREIGN KEY (`production_task_id`) REFERENCES `production_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_checks` ADD CONSTRAINT `quality_checks_checked_by_user_id_fkey` FOREIGN KEY (`checked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
