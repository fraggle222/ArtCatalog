-- CreateTable
CREATE TABLE `favorite_lists` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `owner_id` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `favorite_lists_owner_id_idx`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorite_list_members` (
    `favorite_list_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `access` ENUM('viewer') NOT NULL DEFAULT 'viewer',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favorite_list_members_user_id_idx`(`user_id`),
    PRIMARY KEY (`favorite_list_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorite_list_artworks` (
    `favorite_list_id` CHAR(36) NOT NULL,
    `artwork_id` CHAR(36) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favorite_list_artworks_artwork_id_idx`(`artwork_id`),
    INDEX `favorite_list_artworks_sort_order_idx`(`favorite_list_id`, `sort_order`),
    PRIMARY KEY (`favorite_list_id`, `artwork_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `favorite_lists` ADD CONSTRAINT `favorite_lists_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `AdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite_list_members` ADD CONSTRAINT `favorite_list_members_favorite_list_id_fkey` FOREIGN KEY (`favorite_list_id`) REFERENCES `favorite_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite_list_members` ADD CONSTRAINT `favorite_list_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `AdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite_list_artworks` ADD CONSTRAINT `favorite_list_artworks_favorite_list_id_fkey` FOREIGN KEY (`favorite_list_id`) REFERENCES `favorite_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite_list_artworks` ADD CONSTRAINT `favorite_list_artworks_artwork_id_fkey` FOREIGN KEY (`artwork_id`) REFERENCES `artworks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
