-- AlterTable
ALTER TABLE `quotations`
  ADD COLUMN `measurement_request_id` CHAR(36) NULL AFTER `project_id`;

-- AlterTable
ALTER TABLE `production_jobs`
  ADD COLUMN `measurement_request_id` CHAR(36) NULL AFTER `project_id`;

-- CreateTable
CREATE TABLE `measurement_requests` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NULL,
    `address_id` CHAR(36) NULL,
    `status` ENUM('REQUESTED', 'SCHEDULED', 'IN_VISIT', 'REGISTERED', 'WITH_OBSERVATIONS', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RESCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `requested_date` DATETIME(3) NOT NULL,
    `scheduled_date` DATETIME(3) NULL,
    `scheduled_start_time` VARCHAR(5) NULL,
    `scheduled_end_time` VARCHAR(5) NULL,
    `assigned_technician_id` CHAR(36) NULL,
    `observations` TEXT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `approved_by_user_id` CHAR(36) NULL,
    `approved_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `measurement_requests_code_key`(`code`),
    INDEX `measurement_requests_client_id_deleted_at_idx`(`client_id`, `deleted_at`),
    INDEX `measurement_requests_project_id_deleted_at_idx`(`project_id`, `deleted_at`),
    INDEX `measurement_requests_address_id_idx`(`address_id`),
    INDEX `measurement_requests_assigned_technician_id_schedule_idx`(`assigned_technician_id`, `scheduled_date`, `deleted_at`),
    INDEX `measurement_requests_status_scheduled_date_deleted_idx`(`status`, `scheduled_date`, `deleted_at`),
    INDEX `measurement_requests_priority_scheduled_date_deleted_idx`(`priority`, `scheduled_date`, `deleted_at`),
    INDEX `measurement_requests_requested_date_deleted_at_idx`(`requested_date`, `deleted_at`),
    INDEX `measurement_requests_approved_by_user_id_idx`(`approved_by_user_id`),
    INDEX `measurement_requests_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `measurement_visits` (
    `id` CHAR(36) NOT NULL,
    `measurement_request_id` CHAR(36) NOT NULL,
    `technician_id` CHAR(36) NULL,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `location_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `general_observations` TEXT NULL,
    `result` ENUM('PENDING', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'REQUIRES_REVISIT') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `measurement_visits_request_id_created_at_idx`(`measurement_request_id`, `created_at`),
    INDEX `measurement_visits_technician_id_started_at_idx`(`technician_id`, `started_at`),
    INDEX `measurement_visits_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `measurement_openings` (
    `id` CHAR(36) NOT NULL,
    `measurement_visit_id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `environment` VARCHAR(191) NOT NULL,
    `element_type` ENUM('WINDOW', 'DOOR', 'SHOWER', 'RAILING', 'MIRROR', 'DIVISION', 'COVER', 'OTHER') NOT NULL,
    `width_mm` DECIMAL(14, 2) NOT NULL,
    `height_mm` DECIMAL(14, 2) NOT NULL,
    `depth_mm` DECIMAL(14, 2) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `observations` TEXT NULL,
    `requires_correction` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('DRAFT', 'REGISTERED', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'REGISTERED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `measurement_openings_visit_id_created_at_idx`(`measurement_visit_id`, `created_at`),
    INDEX `measurement_openings_element_type_status_idx`(`element_type`, `status`),
    INDEX `measurement_openings_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `measurement_evidence` (
    `id` CHAR(36) NOT NULL,
    `measurement_visit_id` CHAR(36) NOT NULL,
    `measurement_opening_id` CHAR(36) NULL,
    `type` ENUM('PHOTO', 'FILE', 'SKETCH', 'CHECKLIST', 'OTHER') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NULL,
    `description` TEXT NULL,
    `uploaded_by_user_id` CHAR(36) NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `measurement_evidence_visit_id_uploaded_at_idx`(`measurement_visit_id`, `uploaded_at`),
    INDEX `measurement_evidence_opening_id_uploaded_at_idx`(`measurement_opening_id`, `uploaded_at`),
    INDEX `measurement_evidence_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    INDEX `measurement_evidence_type_uploaded_at_idx`(`type`, `uploaded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `technical_observations` (
    `id` CHAR(36) NOT NULL,
    `measurement_visit_id` CHAR(36) NOT NULL,
    `type` ENUM('ACCESS', 'STRUCTURAL', 'LEVEL', 'MATERIAL', 'SAFETY', 'OTHER') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `created_by_user_id` CHAR(36) NULL,
    `resolved_by_user_id` CHAR(36) NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `technical_observations_visit_id_status_created_at_idx`(`measurement_visit_id`, `status`, `created_at`),
    INDEX `technical_observations_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `technical_observations_resolved_by_user_id_idx`(`resolved_by_user_id`),
    INDEX `technical_observations_severity_status_idx`(`severity`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `measurement_status_history` (
    `id` CHAR(36) NOT NULL,
    `measurement_request_id` CHAR(36) NOT NULL,
    `from_status` ENUM('REQUESTED', 'SCHEDULED', 'IN_VISIT', 'REGISTERED', 'WITH_OBSERVATIONS', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RESCHEDULED', 'CANCELLED') NULL,
    `to_status` ENUM('REQUESTED', 'SCHEDULED', 'IN_VISIT', 'REGISTERED', 'WITH_OBSERVATIONS', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RESCHEDULED', 'CANCELLED') NOT NULL,
    `changed_by_user_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `measurement_status_history_request_id_created_at_idx`(`measurement_request_id`, `created_at`),
    INDEX `measurement_status_history_changed_by_user_id_idx`(`changed_by_user_id`),
    INDEX `measurement_status_history_to_status_created_at_idx`(`to_status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `quotations_measurement_request_id_deleted_at_idx`
  ON `quotations`(`measurement_request_id`, `deleted_at`);

-- CreateIndex
CREATE INDEX `production_jobs_measurement_request_id_deleted_at_idx`
  ON `production_jobs`(`measurement_request_id`, `deleted_at`);

-- AddForeignKey
ALTER TABLE `measurement_requests`
  ADD CONSTRAINT `measurement_requests_client_id_fkey`
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_requests`
  ADD CONSTRAINT `measurement_requests_project_id_fkey`
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_requests`
  ADD CONSTRAINT `measurement_requests_address_id_fkey`
  FOREIGN KEY (`address_id`) REFERENCES `client_addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_requests`
  ADD CONSTRAINT `measurement_requests_assigned_technician_id_fkey`
  FOREIGN KEY (`assigned_technician_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_requests`
  ADD CONSTRAINT `measurement_requests_created_by_user_id_fkey`
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_requests`
  ADD CONSTRAINT `measurement_requests_approved_by_user_id_fkey`
  FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_visits`
  ADD CONSTRAINT `measurement_visits_measurement_request_id_fkey`
  FOREIGN KEY (`measurement_request_id`) REFERENCES `measurement_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_visits`
  ADD CONSTRAINT `measurement_visits_technician_id_fkey`
  FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_openings`
  ADD CONSTRAINT `measurement_openings_measurement_visit_id_fkey`
  FOREIGN KEY (`measurement_visit_id`) REFERENCES `measurement_visits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_evidence`
  ADD CONSTRAINT `measurement_evidence_measurement_visit_id_fkey`
  FOREIGN KEY (`measurement_visit_id`) REFERENCES `measurement_visits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_evidence`
  ADD CONSTRAINT `measurement_evidence_measurement_opening_id_fkey`
  FOREIGN KEY (`measurement_opening_id`) REFERENCES `measurement_openings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_evidence`
  ADD CONSTRAINT `measurement_evidence_uploaded_by_user_id_fkey`
  FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technical_observations`
  ADD CONSTRAINT `technical_observations_measurement_visit_id_fkey`
  FOREIGN KEY (`measurement_visit_id`) REFERENCES `measurement_visits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technical_observations`
  ADD CONSTRAINT `technical_observations_created_by_user_id_fkey`
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technical_observations`
  ADD CONSTRAINT `technical_observations_resolved_by_user_id_fkey`
  FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_status_history`
  ADD CONSTRAINT `measurement_status_history_measurement_request_id_fkey`
  FOREIGN KEY (`measurement_request_id`) REFERENCES `measurement_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `measurement_status_history`
  ADD CONSTRAINT `measurement_status_history_changed_by_user_id_fkey`
  FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations`
  ADD CONSTRAINT `quotations_measurement_request_id_fkey`
  FOREIGN KEY (`measurement_request_id`) REFERENCES `measurement_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_jobs`
  ADD CONSTRAINT `production_jobs_measurement_request_id_fkey`
  FOREIGN KEY (`measurement_request_id`) REFERENCES `measurement_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
