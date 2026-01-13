-- CreateTable
CREATE TABLE "CustomTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "dataType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isUnique" BOOLEAN NOT NULL DEFAULT false,
    "isTimeseries" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "maxLength" INTEGER,
    "precision" INTEGER,
    "scale" INTEGER,
    "relationTable" TEXT,
    "relationField" TEXT,
    "onDelete" TEXT,
    "validation" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomTable_name_key" ON "CustomTable"("name");

-- CreateIndex
CREATE INDEX "CustomTable_name_idx" ON "CustomTable"("name");

-- CreateIndex
CREATE INDEX "CustomTable_isActive_idx" ON "CustomTable"("isActive");

-- CreateIndex
CREATE INDEX "CustomTable_createdBy_idx" ON "CustomTable"("createdBy");

-- CreateIndex
CREATE INDEX "CustomField_tableId_idx" ON "CustomField"("tableId");

-- CreateIndex
CREATE INDEX "CustomField_dataType_idx" ON "CustomField"("dataType");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_tableId_name_key" ON "CustomField"("tableId", "name");

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "CustomTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
