-- Link each designation to an optional department so the employee form can
-- show only the designations that belong to the selected department.
ALTER TABLE "designations" ADD COLUMN "department_id" TEXT;

ALTER TABLE "designations"
  ADD CONSTRAINT "designations_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "designations_department_id_idx" ON "designations"("department_id");
