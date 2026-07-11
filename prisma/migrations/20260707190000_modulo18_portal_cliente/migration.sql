-- CreateTable
CREATE TABLE `client_portal_users` (
    `id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `password_hash` VARCHAR(255) NULL,
    `status` ENUM('ACTIVO', 'INACTIVO', 'PENDIENTE_INVITACION', 'INVITACION_ENVIADA', 'ACCESO_BLOQUEADO') NOT NULL DEFAULT 'PENDIENTE_INVITACION',
    `last_access_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_portal_users_email_key`(`email`),
    INDEX `client_portal_users_client_id_status_idx`(`client_id`, `status`),
    INDEX `client_portal_users_status_created_at_idx`(`status`, `created_at`),
    INDEX `client_portal_users_last_access_at_idx`(`last_access_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_portal_project_accesses` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `permissions_json` JSON NULL,
    `status` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_portal_project_accesses_user_id_project_id_key`(`user_id`, `project_id`),
    INDEX `client_portal_project_accesses_project_id_status_idx`(`project_id`, `status`),
    INDEX `client_portal_project_accesses_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_portal_documents` (
    `id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NULL,
    `type` ENUM('COTIZACION', 'CONTRATO', 'PLANO', 'MEDICION', 'REPORTE_INSTALACION', 'GARANTIA', 'DOCUMENTO_ADICIONAL') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(255) NOT NULL,
    `visible_to_client` BOOLEAN NOT NULL DEFAULT true,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NULL,
    `uploaded_by_user_id` CHAR(36) NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_portal_documents_client_visible_uploaded_idx`(`client_id`, `visible_to_client`, `uploaded_at`),
    INDEX `client_portal_documents_project_id_visible_to_client_upload_idx`(`project_id`, `visible_to_client`, `uploaded_at`),
    INDEX `client_portal_documents_type_uploaded_at_idx`(`type`, `uploaded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_portal_messages` (
    `id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `portal_user_id` CHAR(36) NULL,
    `internal_user_id` CHAR(36) NULL,
    `sent_by` ENUM('CLIENTE', 'EQUIPO_INTERNO') NOT NULL,
    `message` TEXT NOT NULL,
    `file_url` VARCHAR(255) NULL,
    `attachment_name` VARCHAR(255) NULL,
    `attachment_mime_type` VARCHAR(191) NULL,
    `attachment_size_bytes` INTEGER NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_portal_messages_client_id_created_at_idx`(`client_id`, `created_at`),
    INDEX `client_portal_messages_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `client_portal_messages_portal_user_id_created_at_idx`(`portal_user_id`, `created_at`),
    INDEX `client_portal_messages_read_at_idx`(`read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_portal_invitation_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `used_at` DATETIME(3) NULL,

    UNIQUE INDEX `client_portal_invitation_tokens_token_hash_key`(`token_hash`),
    INDEX `client_portal_invitation_tokens_user_id_expires_at_idx`(`user_id`, `expires_at`),
    INDEX `client_portal_invitation_tokens_used_at_idx`(`used_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_portal_password_reset_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `client_portal_password_reset_tokens_token_hash_key`(`token_hash`),
    INDEX `client_portal_password_reset_tokens_user_id_expires_at_idx`(`user_id`, `expires_at`),
    INDEX `client_portal_password_reset_tokens_used_at_idx`(`used_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_portal_document_downloads` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `document_id` CHAR(36) NULL,
    `reference_key` VARCHAR(100) NOT NULL,
    `reference_id` VARCHAR(191) NOT NULL,
    `downloaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_portal_document_downloads_user_id_downloaded_at_idx`(`user_id`, `downloaded_at`),
    INDEX `client_portal_document_downloads_document_id_downloaded_at_idx`(`document_id`, `downloaded_at`),
    INDEX `client_portal_document_downloads_reference_key_reference_id_idx`(`reference_key`, `reference_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client_portal_users` ADD CONSTRAINT `client_portal_users_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_project_accesses` ADD CONSTRAINT `client_portal_project_accesses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `client_portal_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_project_accesses` ADD CONSTRAINT `client_portal_project_accesses_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_documents` ADD CONSTRAINT `client_portal_documents_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_documents` ADD CONSTRAINT `client_portal_documents_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_documents` ADD CONSTRAINT `client_portal_documents_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_messages` ADD CONSTRAINT `client_portal_messages_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_messages` ADD CONSTRAINT `client_portal_messages_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_messages` ADD CONSTRAINT `client_portal_messages_portal_user_id_fkey` FOREIGN KEY (`portal_user_id`) REFERENCES `client_portal_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_messages` ADD CONSTRAINT `client_portal_messages_internal_user_id_fkey` FOREIGN KEY (`internal_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_invitation_tokens` ADD CONSTRAINT `client_portal_invitation_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `client_portal_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_invitation_tokens` ADD CONSTRAINT `client_portal_invitation_tokens_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_password_reset_tokens` ADD CONSTRAINT `client_portal_password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `client_portal_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_document_downloads` ADD CONSTRAINT `client_portal_document_downloads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `client_portal_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_portal_document_downloads` ADD CONSTRAINT `client_portal_document_downloads_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `client_portal_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
