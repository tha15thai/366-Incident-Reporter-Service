-- Step 1: อัปเดตข้อมูลเก่าให้ตรงกับ Enum ใหม่ (Incident Type)
UPDATE "Incidents"
SET incident_type = 'STORM'
WHERE incident_type IN ('FIRE', 'POWER_OUTAGE');

-- Step 2: อัปเดตข้อมูลเก่าให้ตรงกับ Enum ใหม่ (Status)
UPDATE "Incidents"
SET status = 'IN_PROGRESS'
WHERE status = 'DISPATCHED';

UPDATE "Incidents"
SET status = 'RESOLVED'
WHERE status = 'CLOSED';

-- อัปเดตตารางประวัติสถานะด้วย
UPDATE "StatusHistory"
SET status = 'IN_PROGRESS'
WHERE status = 'DISPATCHED';

UPDATE "StatusHistory"
SET status = 'RESOLVED'
WHERE status = 'CLOSED';

-- Step 3: ลบ Constraint เดิมของ Incident Type และสร้างใหม่
ALTER TABLE "Incidents" DROP CONSTRAINT IF EXISTS "Incidents_incident_type_check";
ALTER TABLE "Incidents" ADD CONSTRAINT "Incidents_incident_type_check" 
CHECK (incident_type IN ('FLOOD', 'EARTHQUAKE', 'STORM'));

-- Step 4: ลบ Constraint เดิมของ Status และสร้างใหม่
ALTER TABLE "Incidents" DROP CONSTRAINT IF EXISTS "Incidents_status_check";
ALTER TABLE "Incidents" ADD CONSTRAINT "Incidents_status_check" 
CHECK (status IN ('REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'));

ALTER TABLE "StatusHistory" DROP CONSTRAINT IF EXISTS "StatusHistory_status_check";
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_status_check" 
CHECK (status IN ('REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'));

-- ข้อความสำหรับแจ้งว่าสำเร็จ
SELECT 'Migration update_inc_0002 completed successfully.' as status;
