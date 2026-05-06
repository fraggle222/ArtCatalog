-- CreateTable
CREATE TABLE `AdminUser` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artworks` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `artist_name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `medium` VARCHAR(120) NULL,
    `dimensions_text` VARCHAR(80) NULL,
    `year_created` INTEGER NULL,
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `artworks_title_idx`(`title`),
    INDEX `artworks_artist_name_idx`(`artist_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artwork_images` (
    `id` CHAR(36) NOT NULL,
    `artwork_id` CHAR(36) NOT NULL,
    `storage_key` VARCHAR(512) NOT NULL,
    `url` VARCHAR(1024) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `artwork_images_artwork_id_idx`(`artwork_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `artwork_images` ADD CONSTRAINT `artwork_images_artwork_id_fkey` FOREIGN KEY (`artwork_id`) REFERENCES `artworks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
