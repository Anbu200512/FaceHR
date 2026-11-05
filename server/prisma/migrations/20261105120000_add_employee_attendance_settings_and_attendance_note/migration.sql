ALTER TABLE "employees"
ADD COLUMN "attendanceSettings" JSONB;

ALTER TABLE "attendance"
ADD COLUMN "note" TEXT;
