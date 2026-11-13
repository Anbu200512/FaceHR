-- Multiple job roles per employee + linked reporting managers.

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "employees" ADD COLUMN "reportingManager1Id" TEXT;
ALTER TABLE "employees" ADD COLUMN "reportingManager2Id" TEXT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reportingManager1Id_fkey" FOREIGN KEY ("reportingManager1Id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reportingManager2Id_fkey" FOREIGN KEY ("reportingManager2Id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
