-- AlterTable
ALTER TABLE `AdminUser` ADD COLUMN `role` ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'admin';
