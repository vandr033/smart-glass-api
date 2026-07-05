-- CreateTable
CREATE TABLE `installation_orders` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `project_id` CHAR(36) NULL,
    `quotation_id` CHAR(36) NULL,
    `client_id` CHAR(36) NOT NULL,
    `address_id` CHAR(36) NULL,
    `assigned_team_id` CHAR(36) NULL,
    `scheduled_date` DATETIME(3) NOT NULL,
    `scheduled_start_time` VARCHAR(5) NULL,
    `scheduled_end_time` VARCHAR(5) NULL,
    `status` ENUM('SCHEDULED', 'EN_ROUTE', 'IN_INSTALLATION', 'PAUSED', 'WITH_OBSERVATIONS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED') NOT NULL DEFAULT 'SCHEDULED',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `installation_type` VARCHAR(100) NOT NULL,
    `notes` TEXT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `assigned_supervisor_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `installation_orders_code_key`(`code`),
    INDEX `installation_orders_project_id_deleted_at_idx`(`project_id`, `deleted_at`),
    INDEX `installation_orders_quotation_id_deleted_at_idx`(`quotation_id`, `deleted_at`),
    INDEX `installation_orders_client_id_deleted_at_idx`(`client_id`, `deleted_at`),
    INDEX `installation_orders_address_id_idx`(`address_id`),
    INDEX `installation_orders_assigned_team_id_scheduled_date_deleted__idx`(`assigned_team_id`, `scheduled_date`, `deleted_at`),
    INDEX `installation_orders_assigned_supervisor_id_scheduled_date_de_idx`(`assigned_supervisor_id`, `scheduled_date`, `deleted_at`),
    INDEX `installation_orders_status_scheduled_date_deleted_at_idx`(`status`, `scheduled_date`, `deleted_at`),
    INDEX `installation_orders_priority_scheduled_date_deleted_at_idx`(`priority`, `scheduled_date`, `deleted_at`),
    INDEX `installation_orders_scheduled_date_deleted_at_idx`(`scheduled_date`, `deleted_at`),
    INDEX `installation_orders_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `installation_teams` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `supervisor_id` CHAR(36) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `installation_teams_name_key`(`name`),
    INDEX `installation_teams_supervisor_id_idx`(`supervisor_id`),
    INDEX `installation_teams_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `installation_team_members` (
    `id` CHAR(36) NOT NULL,
    `team_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `installation_team_members_user_id_active_idx`(`user_id`, `active`),
    INDEX `installation_team_members_team_id_active_idx`(`team_id`, `active`),
    UNIQUE INDEX `installation_team_members_team_id_user_id_key`(`team_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `installation_tasks` (
    `id` CHAR(36) NOT NULL,
    `installation_order_id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `estimated_minutes` INTEGER NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `completed_at` DATETIME(3) NULL,
    `completed_by_user_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `installation_tasks_installation_order_id_sort_order_idx`(`installation_order_id`, `sort_order`),
    INDEX `installation_tasks_status_completed_at_idx`(`status`, `completed_at`),
    INDEX `installation_tasks_completed_by_user_id_idx`(`completed_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `installation_evidence` (
    `id` CHAR(36) NOT NULL,
    `installation_order_id` CHAR(36) NOT NULL,
    `task_id` CHAR(36) NULL,
    `type` ENUM('PHOTO', 'FILE', 'SIGNATURE', 'CHECKLIST', 'OTHER') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NULL,
    `description` TEXT NULL,
    `uploaded_by_user_id` CHAR(36) NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `installation_evidence_installation_order_id_uploaded_at_idx`(`installation_order_id`, `uploaded_at`),
    INDEX `installation_evidence_task_id_uploaded_at_idx`(`task_id`, `uploaded_at`),
    INDEX `installation_evidence_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    INDEX `installation_evidence_type_uploaded_at_idx`(`type`, `uploaded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `installation_issues` (
    `id` CHAR(36) NOT NULL,
    `installation_order_id` CHAR(36) NOT NULL,
    `type` ENUM('ACCESS', 'CLIENT', 'MATERIAL', 'SAFETY', 'TECHNICAL', 'WEATHER', 'OTHER') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `reported_by_user_id` CHAR(36) NULL,
    `resolved_by_user_id` CHAR(36) NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `installation_issues_installation_order_id_status_created_at_idx`(`installation_order_id`, `status`, `created_at`),
    INDEX `installation_issues_reported_by_user_id_idx`(`reported_by_user_id`),
    INDEX `installation_issues_resolved_by_user_id_idx`(`resolved_by_user_id`),
    INDEX `installation_issues_severity_status_idx`(`severity`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `installation_status_history` (
    `id` CHAR(36) NOT NULL,
    `installation_order_id` CHAR(36) NOT NULL,
    `from_status` ENUM('SCHEDULED', 'EN_ROUTE', 'IN_INSTALLATION', 'PAUSED', 'WITH_OBSERVATIONS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED') NULL,
    `to_status` ENUM('SCHEDULED', 'EN_ROUTE', 'IN_INSTALLATION', 'PAUSED', 'WITH_OBSERVATIONS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED') NOT NULL,
    `changed_by_user_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `installation_status_history_installation_order_id_created_at_idx`(`installation_order_id`, `created_at`),
    INDEX `installation_status_history_changed_by_user_id_idx`(`changed_by_user_id`),
    INDEX `installation_status_history_to_status_created_at_idx`(`to_status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `installation_orders` ADD CONSTRAINT `installation_orders_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_orders` ADD CONSTRAINT `installation_orders_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_orders` ADD CONSTRAINT `installation_orders_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_orders` ADD CONSTRAINT `installation_orders_address_id_fkey` FOREIGN KEY (`address_id`) REFERENCES `client_addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_orders` ADD CONSTRAINT `installation_orders_assigned_team_id_fkey` FOREIGN KEY (`assigned_team_id`) REFERENCES `installation_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_orders` ADD CONSTRAINT `installation_orders_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_orders` ADD CONSTRAINT `installation_orders_assigned_supervisor_id_fkey` FOREIGN KEY (`assigned_supervisor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_teams` ADD CONSTRAINT `installation_teams_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_team_members` ADD CONSTRAINT `installation_team_members_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `installation_teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_team_members` ADD CONSTRAINT `installation_team_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_tasks` ADD CONSTRAINT `installation_tasks_installation_order_id_fkey` FOREIGN KEY (`installation_order_id`) REFERENCES `installation_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_tasks` ADD CONSTRAINT `installation_tasks_completed_by_user_id_fkey` FOREIGN KEY (`completed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_evidence` ADD CONSTRAINT `installation_evidence_installation_order_id_fkey` FOREIGN KEY (`installation_order_id`) REFERENCES `installation_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_evidence` ADD CONSTRAINT `installation_evidence_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `installation_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_evidence` ADD CONSTRAINT `installation_evidence_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_issues` ADD CONSTRAINT `installation_issues_installation_order_id_fkey` FOREIGN KEY (`installation_order_id`) REFERENCES `installation_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_issues` ADD CONSTRAINT `installation_issues_reported_by_user_id_fkey` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_issues` ADD CONSTRAINT `installation_issues_resolved_by_user_id_fkey` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_status_history` ADD CONSTRAINT `installation_status_history_installation_order_id_fkey` FOREIGN KEY (`installation_order_id`) REFERENCES `installation_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installation_status_history` ADD CONSTRAINT `installation_status_history_changed_by_user_id_fkey` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
