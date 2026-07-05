-- CreateTable
CREATE TABLE `clients` (
    `id` CHAR(36) NOT NULL,
    `client_type` ENUM('INDIVIDUAL', 'COMPANY') NOT NULL,
    `code` VARCHAR(100) NULL,
    `legal_name` VARCHAR(191) NULL,
    `commercial_name` VARCHAR(191) NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `tax_id` VARCHAR(100) NULL,
    `phone` VARCHAR(50) NULL,
    `whatsapp` VARCHAR(50) NULL,
    `email` VARCHAR(191) NULL,
    `billing_address` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `country` VARCHAR(100) NOT NULL DEFAULT 'Bolivia',
    `notes` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `clients_code_key`(`code`),
    INDEX `clients_deleted_at_idx`(`deleted_at`),
    INDEX `clients_client_type_deleted_at_idx`(`client_type`, `deleted_at`),
    INDEX `clients_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `clients_legal_name_deleted_at_idx`(`legal_name`, `deleted_at`),
    INDEX `clients_commercial_name_deleted_at_idx`(`commercial_name`, `deleted_at`),
    INDEX `clients_first_name_deleted_at_idx`(`first_name`, `deleted_at`),
    INDEX `clients_last_name_deleted_at_idx`(`last_name`, `deleted_at`),
    INDEX `clients_tax_id_deleted_at_idx`(`tax_id`, `deleted_at`),
    INDEX `clients_email_deleted_at_idx`(`email`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_contacts` (
    `id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NULL,
    `phone` VARCHAR(50) NULL,
    `whatsapp` VARCHAR(50) NULL,
    `email` VARCHAR(191) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_contacts_client_id_is_primary_idx`(`client_id`, `is_primary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_addresses` (
    `id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `city` VARCHAR(100) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `is_billing` BOOLEAN NOT NULL DEFAULT false,
    `is_project_site` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_addresses_client_id_is_billing_idx`(`client_id`, `is_billing`),
    INDEX `client_addresses_client_id_is_project_site_idx`(`client_id`, `is_project_site`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `project_type` ENUM('WINDOW', 'DOOR', 'SHOWER', 'FACADE', 'RAILING', 'MIRROR', 'CUSTOM', 'SERVICE') NOT NULL,
    `status` ENUM('LEAD', 'MEASUREMENT_PENDING', 'QUOTATION_PENDING', 'QUOTED', 'APPROVED', 'PURCHASE_PENDING', 'PRODUCTION_PENDING', 'IN_PRODUCTION', 'INSTALLATION_PENDING', 'IN_INSTALLATION', 'COMPLETED', 'CANCELLED', 'ON_HOLD') NOT NULL DEFAULT 'LEAD',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `site_address` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `expected_measurement_date` DATETIME(3) NULL,
    `expected_delivery_date` DATETIME(3) NULL,
    `expected_installation_date` DATETIME(3) NULL,
    `responsible_user_id` CHAR(36) NULL,
    `sales_user_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `projects_code_key`(`code`),
    INDEX `projects_deleted_at_idx`(`deleted_at`),
    INDEX `projects_client_id_deleted_at_idx`(`client_id`, `deleted_at`),
    INDEX `projects_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `projects_priority_deleted_at_idx`(`priority`, `deleted_at`),
    INDEX `projects_project_type_deleted_at_idx`(`project_type`, `deleted_at`),
    INDEX `projects_responsible_user_id_deleted_at_idx`(`responsible_user_id`, `deleted_at`),
    INDEX `projects_sales_user_id_deleted_at_idx`(`sales_user_id`, `deleted_at`),
    INDEX `projects_expected_delivery_date_deleted_at_idx`(`expected_delivery_date`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_status_history` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `from_status` ENUM('LEAD', 'MEASUREMENT_PENDING', 'QUOTATION_PENDING', 'QUOTED', 'APPROVED', 'PURCHASE_PENDING', 'PRODUCTION_PENDING', 'IN_PRODUCTION', 'INSTALLATION_PENDING', 'IN_INSTALLATION', 'COMPLETED', 'CANCELLED', 'ON_HOLD') NULL,
    `to_status` ENUM('LEAD', 'MEASUREMENT_PENDING', 'QUOTATION_PENDING', 'QUOTED', 'APPROVED', 'PURCHASE_PENDING', 'PRODUCTION_PENDING', 'IN_PRODUCTION', 'INSTALLATION_PENDING', 'IN_INSTALLATION', 'COMPLETED', 'CANCELLED', 'ON_HOLD') NOT NULL,
    `changed_by_user_id` CHAR(36) NULL,
    `reason` TEXT NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_status_history_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `project_status_history_changed_by_user_id_idx`(`changed_by_user_id`),
    INDEX `project_status_history_to_status_created_at_idx`(`to_status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_notes` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `note` TEXT NOT NULL,
    `visibility` ENUM('INTERNAL', 'CLIENT_VISIBLE') NOT NULL DEFAULT 'INTERNAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_notes_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `project_notes_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_attachments` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `uploaded_by_user_id` CHAR(36) NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NULL,
    `attachment_type` ENUM('PHOTO', 'PLAN', 'MEASUREMENT', 'CONTRACT', 'QUOTATION', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_attachments_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `project_attachments_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    INDEX `project_attachments_attachment_type_created_at_idx`(`attachment_type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_measurements` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `measured_by_user_id` CHAR(36) NULL,
    `measurement_date` DATETIME(3) NULL,
    `location_description` VARCHAR(255) NULL,
    `width_mm` DECIMAL(14, 2) NULL,
    `height_mm` DECIMAL(14, 2) NULL,
    `depth_mm` DECIMAL(14, 2) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `notes` TEXT NULL,
    `raw_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_measurements_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `project_measurements_measured_by_user_id_idx`(`measured_by_user_id`),
    INDEX `project_measurements_measurement_date_created_at_idx`(`measurement_date`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_addresses` ADD CONSTRAINT `client_addresses_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_sales_user_id_fkey` FOREIGN KEY (`sales_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_status_history` ADD CONSTRAINT `project_status_history_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_status_history` ADD CONSTRAINT `project_status_history_changed_by_user_id_fkey` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_notes` ADD CONSTRAINT `project_notes_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_notes` ADD CONSTRAINT `project_notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_attachments` ADD CONSTRAINT `project_attachments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_attachments` ADD CONSTRAINT `project_attachments_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_measurements` ADD CONSTRAINT `project_measurements_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_measurements` ADD CONSTRAINT `project_measurements_measured_by_user_id_fkey` FOREIGN KEY (`measured_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
