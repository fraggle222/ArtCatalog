-- AlterTable
ALTER TABLE `artwork_images` ADD COLUMN `thumbnail_storage_key` VARCHAR(512) NULL,
    ADD COLUMN `thumbnail_url` VARCHAR(1024) NULL;
