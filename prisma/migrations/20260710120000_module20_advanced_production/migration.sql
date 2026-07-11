-- Module 20 extends the existing production records. No production jobs are copied or removed.
ALTER TABLE `production_tasks`
  MODIFY COLUMN `status` ENUM('PENDING','IN_PROGRESS','PAUSED','COMPLETED','BLOCKED','CANCELLED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE `production_jobs`
  MODIFY COLUMN `priority` ENUM('LOW','NORMAL','HIGH','URGENT','CRITICAL') NOT NULL DEFAULT 'NORMAL';

ALTER TABLE `production_jobs`
  ADD COLUMN `workflow_status` ENUM('DRAFT','PENDING_PLANNING','SCHEDULED','MATERIALS_PREPARATION','READY_TO_START','IN_PROGRESS','PAUSED','BLOCKED','PENDING_QUALITY','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT' AFTER `status`,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1 AFTER `priority`,
  ADD COLUMN `estimated_minutes` INTEGER NOT NULL DEFAULT 0 AFTER `version`,
  ADD COLUMN `required_installation_date` DATETIME(3) NULL AFTER `planned_end_date`,
  ADD COLUMN `current_work_center_id` CHAR(36) NULL AFTER `assigned_to_user_id`;

ALTER TABLE `production_tasks`
  ADD COLUMN `work_center_id` CHAR(36) NULL AFTER `assigned_to_user_id`,
  ADD COLUMN `estimated_minutes` INTEGER NOT NULL DEFAULT 0 AFTER `work_center_id`,
  ADD COLUMN `actual_minutes` INTEGER NOT NULL DEFAULT 0 AFTER `estimated_minutes`,
  ADD COLUMN `scheduled_start` DATETIME(3) NULL AFTER `completed_at`,
  ADD COLUMN `scheduled_end` DATETIME(3) NULL AFTER `scheduled_start`,
  ADD COLUMN `requires_quality_control` BOOLEAN NOT NULL DEFAULT false AFTER `scheduled_end`;

CREATE TABLE `production_work_centers` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('GLASS_CUTTING','POLISHING','DRILLING','SANDBLASTING','LAMINATION','EXTERNAL_TEMPERING','ALUMINUM_CUTTING','PROFILE_MACHINING','ASSEMBLY','SEALING','QUALITY_CONTROL','PACKING','DISPATCH_PREPARATION','OTHER') NOT NULL,
  `capacity_daily_minutes` INTEGER NOT NULL DEFAULT 0,
  `schedule_start` VARCHAR(5) NULL,
  `schedule_end` VARCHAR(5) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `allows_concurrent_tasks` BOOLEAN NOT NULL DEFAULT false,
  `workstation_count` INTEGER NOT NULL DEFAULT 1,
  `setup_minutes` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('AVAILABLE','OCCUPIED','SATURATED','MAINTENANCE','INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
  `unavailable_from` DATETIME(3) NULL,
  `unavailable_to` DATETIME(3) NULL,
  `unavailable_reason` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `production_work_centers_code_key`(`code`),
  INDEX `production_work_centers_type_active_idx`(`type`,`active`),
  INDEX `production_work_centers_status_active_idx`(`status`,`active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_task_dependencies` (
  `id` CHAR(36) NOT NULL,
  `task_id` CHAR(36) NOT NULL,
  `depends_on_task_id` CHAR(36) NOT NULL,
  `type` ENUM('FINISH_TO_START','START_TO_START','FINISH_TO_FINISH') NOT NULL DEFAULT 'FINISH_TO_START',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `production_task_dependencies_task_id_depends_on_task_id_key`(`task_id`,`depends_on_task_id`),
  INDEX `production_task_dependencies_depends_on_task_id_idx`(`depends_on_task_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_blocks` (
  `id` CHAR(36) NOT NULL,
  `production_job_id` CHAR(36) NULL,
  `production_task_id` CHAR(36) NULL,
  `type` ENUM('MATERIAL_SHORTAGE','MEASUREMENT_PENDING','MEASUREMENT_REJECTED','DRAWING_PENDING','APPROVAL_PENDING','MACHINE_UNAVAILABLE','WORK_CENTER_SATURATED','QUALITY_INCIDENT','DEFECTIVE_PART','EXTERNAL_PROCESS_PENDING','STAFF_SHORTAGE','OTHER') NOT NULL,
  `severity` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `description` TEXT NOT NULL,
  `status` ENUM('OPEN','UNDER_REVIEW','IN_PROGRESS','RESOLVED','DISMISSED') NOT NULL DEFAULT 'OPEN',
  `created_by_id` CHAR(36) NULL,
  `assigned_to_id` CHAR(36) NULL,
  `resolved_by_id` CHAR(36) NULL,
  `resolution` TEXT NULL,
  `estimated_impact_minutes` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `resolved_at` DATETIME(3) NULL,
  INDEX `production_blocks_production_job_id_status_severity_idx`(`production_job_id`,`status`,`severity`),
  INDEX `production_blocks_production_task_id_status_severity_idx`(`production_task_id`,`status`,`severity`),
  INDEX `production_blocks_status_created_at_idx`(`status`,`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_time_entries` (
  `id` CHAR(36) NOT NULL,
  `production_task_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NULL,
  `event_type` ENUM('START','PAUSE','RESUME','BLOCK','UNBLOCK','FINISH') NOT NULL,
  `event_at` DATETIME(3) NOT NULL,
  `reason` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `production_time_entries_production_task_id_event_at_idx`(`production_task_id`,`event_at`),
  INDEX `production_time_entries_user_id_event_at_idx`(`user_id`,`event_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_waste_entries` (
  `id` CHAR(36) NOT NULL,
  `production_job_id` CHAR(36) NOT NULL,
  `production_task_id` CHAR(36) NULL,
  `material_id` CHAR(36) NULL,
  `entry_type` ENUM('WASTE','SCRAP','REMNANT') NOT NULL,
  `reason` ENUM('CUTTING','BREAKAGE','MEASUREMENT_ERROR','MATERIAL_DEFECT','MANUFACTURING_ERROR','TECHNICAL_ADJUSTMENT','HANDLING_DAMAGE','OTHER') NOT NULL,
  `quantity` DECIMAL(14,4) NOT NULL,
  `unit` ENUM('MM','CM','M','M2','UNIT','PACKAGE','KG','LITER','HOUR','DAY') NOT NULL,
  `area_m2` DECIMAL(14,4) NULL,
  `width_mm` DECIMAL(14,2) NULL,
  `height_mm` DECIMAL(14,2) NULL,
  `length_mm` DECIMAL(14,2) NULL,
  `recoverable` BOOLEAN NOT NULL DEFAULT false,
  `notes` TEXT NULL,
  `evidence_json` JSON NULL,
  `reported_by_id` CHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `production_waste_entries_production_job_id_created_at_idx`(`production_job_id`,`created_at`),
  INDEX `production_waste_entries_production_task_id_created_at_idx`(`production_task_id`,`created_at`),
  INDEX `production_waste_entries_material_id_reason_idx`(`material_id`,`reason`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `production_jobs_workflow_status_deleted_at_idx` ON `production_jobs`(`workflow_status`,`deleted_at`);
CREATE INDEX `production_jobs_current_work_center_id_deleted_at_idx` ON `production_jobs`(`current_work_center_id`,`deleted_at`);
CREATE INDEX `production_tasks_work_center_schedule_idx` ON `production_tasks`(`work_center_id`,`scheduled_start`,`scheduled_end`);

ALTER TABLE `production_jobs`
  ADD CONSTRAINT `production_jobs_current_work_center_id_fkey` FOREIGN KEY (`current_work_center_id`) REFERENCES `production_work_centers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `production_tasks`
  ADD CONSTRAINT `production_tasks_work_center_id_fkey` FOREIGN KEY (`work_center_id`) REFERENCES `production_work_centers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `production_task_dependencies`
  ADD CONSTRAINT `production_task_dependencies_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `production_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `production_task_dependencies_depends_on_task_id_fkey` FOREIGN KEY (`depends_on_task_id`) REFERENCES `production_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `production_blocks`
  ADD CONSTRAINT `production_blocks_production_job_id_fkey` FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `production_blocks_production_task_id_fkey` FOREIGN KEY (`production_task_id`) REFERENCES `production_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `production_blocks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `production_blocks_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `production_blocks_resolved_by_id_fkey` FOREIGN KEY (`resolved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `production_time_entries`
  ADD CONSTRAINT `production_time_entries_production_task_id_fkey` FOREIGN KEY (`production_task_id`) REFERENCES `production_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `production_time_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `production_waste_entries`
  ADD CONSTRAINT `production_waste_entries_production_job_id_fkey` FOREIGN KEY (`production_job_id`) REFERENCES `production_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `production_waste_entries_production_task_id_fkey` FOREIGN KEY (`production_task_id`) REFERENCES `production_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `production_waste_entries_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `production_waste_entries_reported_by_id_fkey` FOREIGN KEY (`reported_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
