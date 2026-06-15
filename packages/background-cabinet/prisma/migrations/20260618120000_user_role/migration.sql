-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user';

-- Bootstrap admin login (if present)
UPDATE "User" SET "role" = 'admin' WHERE "login" = 'admin';
