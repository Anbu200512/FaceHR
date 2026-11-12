-- Performance indexes for the read-heavy dashboard / attendance / leave queries.

CREATE INDEX IF NOT EXISTS "employees_status_department_idx" ON "employees"("status", "department");
CREATE INDEX IF NOT EXISTS "employees_status_office_idx" ON "employees"("status", "office");

CREATE INDEX IF NOT EXISTS "attendance_employee_checkInTime_idx" ON "attendance"("employee", "checkInTime");

CREATE INDEX IF NOT EXISTS "leaves_employee_status_idx" ON "leaves"("employee", "status");
CREATE INDEX IF NOT EXISTS "leaves_status_startDate_endDate_idx" ON "leaves"("status", "startDate", "endDate");

CREATE INDEX IF NOT EXISTS "resignations_status_resignationDate_idx" ON "resignations"("status", "resignationDate");
