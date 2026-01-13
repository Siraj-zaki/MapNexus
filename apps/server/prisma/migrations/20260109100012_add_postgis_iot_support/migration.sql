-- AlterTable
ALTER TABLE "CustomField" ADD COLUMN     "geometryType" TEXT,
ADD COLUMN     "iotConfig" JSONB,
ADD COLUMN     "srid" INTEGER DEFAULT 4326;
