-- AlterTable
ALTER TABLE `artworks` ADD COLUMN `artist_id` CHAR(36) NULL,
    ADD COLUMN `dimensions_unknown` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `medium_custom` VARCHAR(120) NULL,
    ADD COLUMN `medium_preset` VARCHAR(120) NULL,
    ADD COLUMN `title_unknown` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `title` VARCHAR(200) NULL,
    MODIFY `artist_name` VARCHAR(160) NULL;

-- CreateTable
CREATE TABLE `artists` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `birth_year` INTEGER NULL,
    `death_year` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `artists_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `artworks_artist_id_idx` ON `artworks`(`artist_id`);

-- AddForeignKey
ALTER TABLE `artworks` ADD CONSTRAINT `artworks_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
