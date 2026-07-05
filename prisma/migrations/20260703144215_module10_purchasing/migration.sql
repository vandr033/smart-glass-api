-- CreateTable
CREATE TABLE `purchase_requests` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PO', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `source_type` ENUM('QUOTATION', 'PROJECT', 'CUTTING_PLAN', 'INVENTORY_SHORTAGE', 'MANUAL') NOT NULL,
    `source_id` VARCHAR(191) NULL,
    `requested_by_user_id` CHAR(36) NULL,
    `approved_by_user_id` CHAR(36) NULL,
    `approved_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `purchase_requests_code_key`(`code`),
    INDEX `purchase_requests_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `purchase_requests_source_type_source_id_idx`(`source_type`, `source_id`),
    INDEX `purchase_requests_requested_by_user_id_idx`(`requested_by_user_id`),
    INDEX `purchase_requests_approved_by_user_id_idx`(`approved_by_user_id`),
    INDEX `purchase_requests_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_request_items` (
    `id` CHAR(36) NOT NULL,
    `purchase_request_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(14, 4) NOT NULL,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `required_date` DATETIME(3) NULL,
    `preferred_supplier_id` CHAR(36) NULL,
    `selected_supplier_id` CHAR(36) NULL,
    `estimated_unit_cost` DECIMAL(14, 4) NULL,
    `estimated_total_cost` DECIMAL(14, 4) NULL,
    `status` ENUM('OPEN', 'SUPPLIER_SELECTED', 'ORDERED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `purchase_request_items_purchase_request_id_status_idx`(`purchase_request_id`, `status`),
    INDEX `purchase_request_items_material_id_idx`(`material_id`),
    INDEX `purchase_request_items_preferred_supplier_id_idx`(`preferred_supplier_id`),
    INDEX `purchase_request_items_selected_supplier_id_idx`(`selected_supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_comparisons` (
    `id` CHAR(36) NOT NULL,
    `purchase_request_id` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'COMPLETED', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `scoring_config_id` CHAR(36) NULL,
    `result_json` JSON NULL,
    `selected_combination_json` JSON NULL,
    `created_by_user_id` CHAR(36) NULL,
    `approved_by_user_id` CHAR(36) NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_comparisons_purchase_request_id_status_idx`(`purchase_request_id`, `status`),
    INDEX `supplier_comparisons_scoring_config_id_idx`(`scoring_config_id`),
    INDEX `supplier_comparisons_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `supplier_comparisons_approved_by_user_id_idx`(`approved_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_comparison_options` (
    `id` CHAR(36) NOT NULL,
    `comparison_id` CHAR(36) NOT NULL,
    `purchase_request_item_id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `unit_price` DECIMAL(14, 4) NULL,
    `total_price` DECIMAL(14, 4) NULL,
    `delivery_days` INTEGER NULL,
    `available_credit` BOOLEAN NULL,
    `supplier_score` DECIMAL(9, 4) NULL,
    `final_score` DECIMAL(9, 4) NULL,
    `score_breakdown_json` JSON NULL,
    `is_selected` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_comparison_options_comparison_id_is_selected_idx`(`comparison_id`, `is_selected`),
    INDEX `supplier_comparison_options_purchase_request_item_id_idx`(`purchase_request_item_id`),
    INDEX `supplier_comparison_options_supplier_id_idx`(`supplier_id`),
    INDEX `supplier_comparison_options_material_id_idx`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `purchase_request_id` CHAR(36) NULL,
    `status` ENUM('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `order_date` DATETIME(3) NOT NULL,
    `expected_delivery_date` DATETIME(3) NULL,
    `currency` VARCHAR(16) NOT NULL DEFAULT 'BOB',
    `subtotal` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `sent_at` DATETIME(3) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `purchase_orders_code_key`(`code`),
    INDEX `purchase_orders_supplier_id_status_deleted_at_idx`(`supplier_id`, `status`, `deleted_at`),
    INDEX `purchase_orders_purchase_request_id_idx`(`purchase_request_id`),
    INDEX `purchase_orders_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `purchase_orders_order_date_deleted_at_idx`(`order_date`, `deleted_at`),
    INDEX `purchase_orders_expected_delivery_date_deleted_at_idx`(`expected_delivery_date`, `deleted_at`),
    INDEX `purchase_orders_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` CHAR(36) NOT NULL,
    `purchase_order_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(14, 4) NOT NULL,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `unit_price` DECIMAL(14, 4) NOT NULL,
    `total_price` DECIMAL(14, 4) NOT NULL,
    `received_quantity` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `purchase_order_items_purchase_order_id_idx`(`purchase_order_id`),
    INDEX `purchase_order_items_material_id_idx`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_receipts` (
    `id` CHAR(36) NOT NULL,
    `purchase_order_id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `warehouse_id` CHAR(36) NOT NULL,
    `received_by_user_id` CHAR(36) NULL,
    `received_at` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_receipts_code_key`(`code`),
    INDEX `purchase_receipts_purchase_order_id_received_at_idx`(`purchase_order_id`, `received_at`),
    INDEX `purchase_receipts_warehouse_id_received_at_idx`(`warehouse_id`, `received_at`),
    INDEX `purchase_receipts_received_by_user_id_idx`(`received_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_receipt_items` (
    `id` CHAR(36) NOT NULL,
    `purchase_receipt_id` CHAR(36) NOT NULL,
    `purchase_order_item_id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `received_quantity` DECIMAL(14, 4) NOT NULL,
    `unit` ENUM('MM', 'CM', 'M', 'M2', 'UNIT', 'PACKAGE', 'KG', 'LITER', 'HOUR', 'DAY') NOT NULL,
    `batch_number` VARCHAR(100) NULL,
    `location_code` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `purchase_receipt_items_purchase_receipt_id_idx`(`purchase_receipt_id`),
    INDEX `purchase_receipt_items_purchase_order_item_id_idx`(`purchase_order_item_id`),
    INDEX `purchase_receipt_items_material_id_idx`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_preferred_supplier_id_fkey` FOREIGN KEY (`preferred_supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_selected_supplier_id_fkey` FOREIGN KEY (`selected_supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_comparisons` ADD CONSTRAINT `supplier_comparisons_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_comparisons` ADD CONSTRAINT `supplier_comparisons_scoring_config_id_fkey` FOREIGN KEY (`scoring_config_id`) REFERENCES `supplier_scoring_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_comparisons` ADD CONSTRAINT `supplier_comparisons_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_comparisons` ADD CONSTRAINT `supplier_comparisons_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_comparison_options` ADD CONSTRAINT `supplier_comparison_options_comparison_id_fkey` FOREIGN KEY (`comparison_id`) REFERENCES `supplier_comparisons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_comparison_options` ADD CONSTRAINT `supplier_comparison_options_purchase_request_item_id_fkey` FOREIGN KEY (`purchase_request_item_id`) REFERENCES `purchase_request_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_comparison_options` ADD CONSTRAINT `supplier_comparison_options_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_comparison_options` ADD CONSTRAINT `supplier_comparison_options_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_received_by_user_id_fkey` FOREIGN KEY (`received_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_receipt_items` ADD CONSTRAINT `purchase_receipt_items_purchase_receipt_id_fkey` FOREIGN KEY (`purchase_receipt_id`) REFERENCES `purchase_receipts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_receipt_items` ADD CONSTRAINT `purchase_receipt_items_purchase_order_item_id_fkey` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_receipt_items` ADD CONSTRAINT `purchase_receipt_items_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
