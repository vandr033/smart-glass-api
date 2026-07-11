-- CreateTable
CREATE TABLE `postventa_cases` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NULL,
    `quotation_id` CHAR(36) NULL,
    `installation_id` CHAR(36) NULL,
    `warranty_id` CHAR(36) NULL,
    `case_type` ENUM('GARANTIA', 'RECLAMO', 'AJUSTE', 'ROTURA', 'FUGA', 'MALA_INSTALACION', 'PRODUCTO_INCOMPLETO', 'REPOSICION', 'OTRO') NOT NULL,
    `status` ENUM('REPORTADO', 'EN_REVISION', 'VISITA_PROGRAMADA', 'EN_ATENCION', 'PENDIENTE_REPUESTO', 'RESUELTO', 'RECHAZADO', 'CERRADO') NOT NULL DEFAULT 'REPORTADO',
    `priority` ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
    `reported_at` DATETIME(3) NOT NULL,
    `commitment_date` DATETIME(3) NULL,
    `responsible_user_id` CHAR(36) NULL,
    `description` TEXT NOT NULL,
    `proposed_solution` TEXT NULL,
    `internal_notes` TEXT NULL,
    `outside_warranty` BOOLEAN NOT NULL DEFAULT false,
    `closed_at` DATETIME(3) NULL,
    `created_by_user_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `postventa_cases_code_key`(`code`),
    INDEX `postventa_cases_client_id_status_idx`(`client_id`, `status`),
    INDEX `postventa_cases_project_id_status_idx`(`project_id`, `status`),
    INDEX `postventa_cases_quotation_id_status_idx`(`quotation_id`, `status`),
    INDEX `postventa_cases_installation_id_status_idx`(`installation_id`, `status`),
    INDEX `postventa_cases_warranty_id_idx`(`warranty_id`),
    INDEX `postventa_cases_responsible_user_id_status_idx`(`responsible_user_id`, `status`),
    INDEX `postventa_cases_priority_status_idx`(`priority`, `status`),
    INDEX `postventa_cases_reported_at_status_idx`(`reported_at`, `status`),
    INDEX `postventa_cases_commitment_date_status_idx`(`commitment_date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_warranties` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `product_type` VARCHAR(100) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `conditions` TEXT NULL,
    `status` ENUM('VIGENTE', 'VENCIDA', 'ANULADA') NOT NULL DEFAULT 'VIGENTE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_warranties_project_id_status_idx`(`project_id`, `status`),
    INDEX `product_warranties_client_id_status_idx`(`client_id`, `status`),
    INDEX `product_warranties_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `postventa_activities` (
    `id` CHAR(36) NOT NULL,
    `postventa_case_id` CHAR(36) NOT NULL,
    `activity_type` ENUM('VISITA_REVISION', 'DIAGNOSTICO', 'SOLUCION', 'REPUESTO', 'CIERRE', 'NOTA_INTERNA') NOT NULL,
    `description` TEXT NOT NULL,
    `responsible_user_id` CHAR(36) NULL,
    `scheduled_at` DATETIME(3) NULL,
    `executed_at` DATETIME(3) NULL,
    `status` ENUM('PENDIENTE', 'PROGRAMADA', 'EJECUTADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `postventa_activities_postventa_case_id_created_at_idx`(`postventa_case_id`, `created_at`),
    INDEX `postventa_activities_responsible_user_id_status_idx`(`responsible_user_id`, `status`),
    INDEX `postventa_activities_scheduled_at_status_idx`(`scheduled_at`, `status`),
    INDEX `postventa_activities_executed_at_status_idx`(`executed_at`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `postventa_evidence` (
    `id` CHAR(36) NOT NULL,
    `postventa_case_id` CHAR(36) NOT NULL,
    `postventa_activity_id` CHAR(36) NULL,
    `evidence_type` ENUM('FOTO', 'DOCUMENTO', 'VIDEO', 'OTRO') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NULL,
    `description` TEXT NULL,
    `uploaded_by_user_id` CHAR(36) NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `postventa_evidence_postventa_case_id_uploaded_at_idx`(`postventa_case_id`, `uploaded_at`),
    INDEX `postventa_evidence_postventa_activity_id_uploaded_at_idx`(`postventa_activity_id`, `uploaded_at`),
    INDEX `postventa_evidence_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    INDEX `postventa_evidence_evidence_type_uploaded_at_idx`(`evidence_type`, `uploaded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `postventa_costs` (
    `id` CHAR(36) NOT NULL,
    `postventa_case_id` CHAR(36) NOT NULL,
    `category` ENUM('GARANTIA', 'RECLAMO', 'REPOSICION', 'VISITA', 'DIAGNOSTICO', 'MATERIAL', 'MANO_DE_OBRA', 'TRANSPORTE', 'INSTALACION', 'OTRO') NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(14, 4) NOT NULL,
    `origin` ENUM('MANUAL', 'INVENTARIO', 'INSTALACION', 'PRODUCCION', 'GARANTIA', 'COTIZACION', 'OTRO') NOT NULL,
    `reference_id` VARCHAR(191) NULL,
    `cost_date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `postventa_costs_postventa_case_id_cost_date_idx`(`postventa_case_id`, `cost_date`),
    INDEX `postventa_costs_category_cost_date_idx`(`category`, `cost_date`),
    INDEX `postventa_costs_origin_cost_date_idx`(`origin`, `cost_date`),
    INDEX `postventa_costs_reference_id_idx`(`reference_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `postventa_status_history` (
    `id` CHAR(36) NOT NULL,
    `postventa_case_id` CHAR(36) NOT NULL,
    `from_status` ENUM('REPORTADO', 'EN_REVISION', 'VISITA_PROGRAMADA', 'EN_ATENCION', 'PENDIENTE_REPUESTO', 'RESUELTO', 'RECHAZADO', 'CERRADO') NULL,
    `to_status` ENUM('REPORTADO', 'EN_REVISION', 'VISITA_PROGRAMADA', 'EN_ATENCION', 'PENDIENTE_REPUESTO', 'RESUELTO', 'RECHAZADO', 'CERRADO') NOT NULL,
    `changed_by_user_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `postventa_status_history_postventa_case_id_created_at_idx`(`postventa_case_id`, `created_at`),
    INDEX `postventa_status_history_changed_by_user_id_idx`(`changed_by_user_id`),
    INDEX `postventa_status_history_to_status_created_at_idx`(`to_status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `postventa_inventory_reservations` (
    `id` CHAR(36) NOT NULL,
    `postventa_case_id` CHAR(36) NOT NULL,
    `inventory_reservation_id` CHAR(36) NOT NULL,
    `notes` TEXT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `postventa_inventory_reservations_inventory_reservation_id_idx`(`inventory_reservation_id`),
    INDEX `postventa_inventory_reservations_created_by_user_id_idx`(`created_by_user_id`),
    UNIQUE INDEX `postventa_inventory_reservations_postventa_case_id_inventory_key`(`postventa_case_id`, `inventory_reservation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `postventa_cases` ADD CONSTRAINT `postventa_cases_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_cases` ADD CONSTRAINT `postventa_cases_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_cases` ADD CONSTRAINT `postventa_cases_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_cases` ADD CONSTRAINT `postventa_cases_installation_id_fkey` FOREIGN KEY (`installation_id`) REFERENCES `installation_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_cases` ADD CONSTRAINT `postventa_cases_warranty_id_fkey` FOREIGN KEY (`warranty_id`) REFERENCES `product_warranties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_cases` ADD CONSTRAINT `postventa_cases_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_cases` ADD CONSTRAINT `postventa_cases_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_warranties` ADD CONSTRAINT `product_warranties_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_warranties` ADD CONSTRAINT `product_warranties_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_activities` ADD CONSTRAINT `postventa_activities_postventa_case_id_fkey` FOREIGN KEY (`postventa_case_id`) REFERENCES `postventa_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_activities` ADD CONSTRAINT `postventa_activities_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_evidence` ADD CONSTRAINT `postventa_evidence_postventa_case_id_fkey` FOREIGN KEY (`postventa_case_id`) REFERENCES `postventa_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_evidence` ADD CONSTRAINT `postventa_evidence_postventa_activity_id_fkey` FOREIGN KEY (`postventa_activity_id`) REFERENCES `postventa_activities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_evidence` ADD CONSTRAINT `postventa_evidence_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_costs` ADD CONSTRAINT `postventa_costs_postventa_case_id_fkey` FOREIGN KEY (`postventa_case_id`) REFERENCES `postventa_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_status_history` ADD CONSTRAINT `postventa_status_history_postventa_case_id_fkey` FOREIGN KEY (`postventa_case_id`) REFERENCES `postventa_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_status_history` ADD CONSTRAINT `postventa_status_history_changed_by_user_id_fkey` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_inventory_reservations` ADD CONSTRAINT `postventa_inventory_reservations_postventa_case_id_fkey` FOREIGN KEY (`postventa_case_id`) REFERENCES `postventa_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_inventory_reservations` ADD CONSTRAINT `postventa_inventory_reservations_inventory_reservation_id_fkey` FOREIGN KEY (`inventory_reservation_id`) REFERENCES `inventory_reservations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postventa_inventory_reservations` ADD CONSTRAINT `postventa_inventory_reservations_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `measurement_evidence` RENAME INDEX `measurement_evidence_opening_id_uploaded_at_idx` TO `measurement_evidence_measurement_opening_id_uploaded_at_idx`;

-- RenameIndex
ALTER TABLE `measurement_evidence` RENAME INDEX `measurement_evidence_visit_id_uploaded_at_idx` TO `measurement_evidence_measurement_visit_id_uploaded_at_idx`;

-- RenameIndex
ALTER TABLE `measurement_openings` RENAME INDEX `measurement_openings_visit_id_created_at_idx` TO `measurement_openings_measurement_visit_id_created_at_idx`;

-- RenameIndex
ALTER TABLE `measurement_requests` RENAME INDEX `measurement_requests_assigned_technician_id_schedule_idx` TO `measurement_requests_assigned_technician_id_scheduled_date_d_idx`;

-- RenameIndex
ALTER TABLE `measurement_requests` RENAME INDEX `measurement_requests_priority_scheduled_date_deleted_idx` TO `measurement_requests_priority_scheduled_date_deleted_at_idx`;

-- RenameIndex
ALTER TABLE `measurement_requests` RENAME INDEX `measurement_requests_status_scheduled_date_deleted_idx` TO `measurement_requests_status_scheduled_date_deleted_at_idx`;

-- RenameIndex
ALTER TABLE `measurement_status_history` RENAME INDEX `measurement_status_history_request_id_created_at_idx` TO `measurement_status_history_measurement_request_id_created_at_idx`;

-- RenameIndex
ALTER TABLE `measurement_visits` RENAME INDEX `measurement_visits_request_id_created_at_idx` TO `measurement_visits_measurement_request_id_created_at_idx`;

-- RenameIndex
ALTER TABLE `technical_observations` RENAME INDEX `technical_observations_visit_id_status_created_at_idx` TO `technical_observations_measurement_visit_id_status_created_a_idx`;
