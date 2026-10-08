-- AlterTable
ALTER TABLE `Credential` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `Notification` MODIFY `type` ENUM('ARRIVEE', 'DEPART', 'REFUS', 'ENROLEMENT', 'REGULARISATION') NOT NULL;

-- AlterTable
ALTER TABLE `Pointage` ADD COLUMN `motif` TEXT NULL,
    ADD COLUMN `regularise` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `regularisePar` INTEGER NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `actif` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `doitChangerMdp` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `role` ENUM('EMPLOYEE', 'ADMIN', 'TECH') NOT NULL DEFAULT 'EMPLOYEE';

-- CreateTable
CREATE TABLE `Parametre` (
    `cle` VARCHAR(64) NOT NULL,
    `valeur` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Journal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `auteurId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `detail` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Journal_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_createdAt_idx` ON `Notification`(`createdAt`);

-- CreateIndex
CREATE INDEX `Pointage_jour_idx` ON `Pointage`(`jour`);

-- AddForeignKey
ALTER TABLE `Journal` ADD CONSTRAINT `Journal_auteurId_fkey` FOREIGN KEY (`auteurId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
