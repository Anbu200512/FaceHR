ALTER TABLE "employees"
ADD COLUMN IF NOT EXISTS "attendanceSettings" JSONB;

ALTER TABLE "attendance"
ADD COLUMN IF NOT EXISTS "note" TEXT;
