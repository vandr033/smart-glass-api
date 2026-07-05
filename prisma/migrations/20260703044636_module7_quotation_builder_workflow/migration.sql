-- CreateTable
CREATE TABLE `quotations` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `currency` VARCHAR(16) NOT NULL DEFAULT 'BOB',
    `exchange_rate` DECIMAL(14, 6) NULL,
    `valid_until` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `internal_notes` TEXT NULL,
    `subtotal_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `subtotal_sale` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `total_sale` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `margin_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `margin_percent` DECIMAL(9, 4) NOT NULL DEFAULT 0,
    `created_by_user_id` CHAR(36) NULL,
    `approved_by_user_id` CHAR(36) NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `quotations_code_key`(`code`),
    INDEX `quotations_client_id_deleted_at_idx`(`client_id`, `deleted_at`),
    INDEX `quotations_project_id_deleted_at_idx`(`project_id`, `deleted_at`),
    INDEX `quotations_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `quotations_valid_until_deleted_at_idx`(`valid_until`, `deleted_at`),
    INDEX `quotations_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `quotations_approved_by_user_id_idx`(`approved_by_user_id`),
    INDEX `quotations_created_at_deleted_at_idx`(`created_at`, `deleted_at`),
    INDEX `quotations_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_versions` (
    `id` CHAR(36) NOT NULL,
    `quotation_id` CHAR(36) NOT NULL,
    `version_number` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `snapshot_json` JSON NOT NULL,
    `subtotal_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `subtotal_sale` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `total_sale` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `margin_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `margin_percent` DECIMAL(9, 4) NOT NULL DEFAULT 0,
    `created_by_user_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quotation_versions_quotation_id_status_idx`(`quotation_id`, `status`),
    INDEX `quotation_versions_created_by_user_id_idx`(`created_by_user_id`),
    UNIQUE INDEX `quotation_versions_quotation_id_version_number_key`(`quotation_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` CHAR(36) NOT NULL,
    `quotation_id` CHAR(36) NOT NULL,
    `quotation_version_id` CHAR(36) NULL,
    `product_template_id` CHAR(36) NULL,
    `product_template_version_id` CHAR(36) NULL,
    `item_type` ENUM('TEMPLATE_PRODUCT', 'MANUAL_MATERIAL', 'MANUAL_SERVICE', 'DISCOUNT', 'NOTE') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(14, 4) NOT NULL DEFAULT 1,
    `input_values_json` JSON NULL,
    `calculation_result_json` JSON NULL,
    `subtotal_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `subtotal_sale` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `margin_percent` DECIMAL(9, 4) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quotation_items_quotation_id_sort_order_idx`(`quotation_id`, `sort_order`),
    INDEX `quotation_items_quotation_version_id_sort_order_idx`(`quotation_version_id`, `sort_order`),
    INDEX `quotation_items_product_template_id_idx`(`product_template_id`),
    INDEX `quotation_items_product_template_version_id_idx`(`product_template_version_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_item_materials` (
    `id` CHAR(36) NOT NULL,
    `quotation_item_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NULL,
    `material_code` VARCHAR(100) NULL,
    `material_name` VARCHAR(191) NOT NULL,
    `rule_type` ENUM('LINEAR_CUT', 'SHEET_CUT', 'UNIT_QUANTITY', 'PACKAGE_QUANTITY', 'SERVICE_COST', 'MANUAL') NOT NULL,
    `required_quantity` DECIMAL(14, 4) NOT NULL,
    `unit` VARCHAR(50) NOT NULL,
    `unit_cost` DECIMAL(14, 4) NULL,
    `total_cost` DECIMAL(14, 4) NOT NULL,
    `waste_percent` DECIMAL(9, 4) NULL,
    `supplier_id` CHAR(36) NULL,
    `source` ENUM('TEMPLATE', 'MANUAL', 'PRICE_LIST') NOT NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quotation_item_materials_quotation_item_id_idx`(`quotation_item_id`),
    INDEX `quotation_item_materials_material_id_idx`(`material_id`),
    INDEX `quotation_item_materials_supplier_id_idx`(`supplier_id`),
    INDEX `quotation_item_materials_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_approvals` (
    `id` CHAR(36) NOT NULL,
    `quotation_id` CHAR(36) NOT NULL,
    `requested_by_user_id` CHAR(36) NOT NULL,
    `approver_user_id` CHAR(36) NULL,
    `approval_type` ENUM('LOW_MARGIN', 'HIGH_DISCOUNT', 'MANUAL_REVIEW', 'PRICE_EXCEPTION') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reason` TEXT NOT NULL,
    `decision_notes` TEXT NULL,
    `decided_by_user_id` CHAR(36) NULL,
    `decided_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quotation_approvals_quotation_id_status_idx`(`quotation_id`, `status`),
    INDEX `quotation_approvals_approver_user_id_status_idx`(`approver_user_id`, `status`),
    INDEX `quotation_approvals_requested_by_user_id_idx`(`requested_by_user_id`),
    INDEX `quotation_approvals_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_status_history` (
    `id` CHAR(36) NOT NULL,
    `quotation_id` CHAR(36) NOT NULL,
    `from_status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED') NULL,
    `to_status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL,
    `changed_by_user_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `quotation_status_history_quotation_id_created_at_idx`(`quotation_id`, `created_at`),
    INDEX `quotation_status_history_changed_by_user_id_idx`(`changed_by_user_id`),
    INDEX `quotation_status_history_to_status_created_at_idx`(`to_status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_pdf_exports` (
    `id` CHAR(36) NOT NULL,
    `quotation_id` CHAR(36) NOT NULL,
    `quotation_version_id` CHAR(36) NULL,
    `file_path` VARCHAR(255) NULL,
    `generated_by_user_id` CHAR(36) NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata_json` JSON NULL,

    INDEX `quotation_pdf_exports_quotation_id_generated_at_idx`(`quotation_id`, `generated_at`),
    INDEX `quotation_pdf_exports_quotation_version_id_idx`(`quotation_version_id`),
    INDEX `quotation_pdf_exports_generated_by_user_id_idx`(`generated_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_versions` ADD CONSTRAINT `quotation_versions_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_versions` ADD CONSTRAINT `quotation_versions_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotation_version_id_fkey` FOREIGN KEY (`quotation_version_id`) REFERENCES `quotation_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_product_template_id_fkey` FOREIGN KEY (`product_template_id`) REFERENCES `product_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_product_template_version_id_fkey` FOREIGN KEY (`product_template_version_id`) REFERENCES `product_template_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_item_materials` ADD CONSTRAINT `quotation_item_materials_quotation_item_id_fkey` FOREIGN KEY (`quotation_item_id`) REFERENCES `quotation_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_item_materials` ADD CONSTRAINT `quotation_item_materials_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_item_materials` ADD CONSTRAINT `quotation_item_materials_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_approvals` ADD CONSTRAINT `quotation_approvals_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_approvals` ADD CONSTRAINT `quotation_approvals_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_approvals` ADD CONSTRAINT `quotation_approvals_approver_user_id_fkey` FOREIGN KEY (`approver_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_approvals` ADD CONSTRAINT `quotation_approvals_decided_by_user_id_fkey` FOREIGN KEY (`decided_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_status_history` ADD CONSTRAINT `quotation_status_history_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_status_history` ADD CONSTRAINT `quotation_status_history_changed_by_user_id_fkey` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_pdf_exports` ADD CONSTRAINT `quotation_pdf_exports_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_pdf_exports` ADD CONSTRAINT `quotation_pdf_exports_quotation_version_id_fkey` FOREIGN KEY (`quotation_version_id`) REFERENCES `quotation_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_pdf_exports` ADD CONSTRAINT `quotation_pdf_exports_generated_by_user_id_fkey` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
