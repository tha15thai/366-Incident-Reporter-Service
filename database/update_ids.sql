BEGIN;

-- 1. สร้างตารางจำลองจับคู่ ID เก่ากับ ID ใหม่ (เรียงตามลำดับเวลา)
CREATE TEMP TABLE id_map AS
SELECT incident_id as old_id, 
       'INC_' || LPAD(row_number() over(order by created_at)::text, 4, '0') as new_id
FROM "Incidents";

-- 2. ปลดล็อคความสัมพันธ์ระหว่างตาราง (Foreign Key) ชั่วคราว
ALTER TABLE "StatusHistory" DROP CONSTRAINT IF EXISTS "StatusHistory_incident_id_fkey";

-- 3. อัปเดต ID ใหม่ในตารางหลัก
UPDATE "Incidents" i 
SET incident_id = m.new_id 
FROM id_map m 
WHERE i.incident_id = m.old_id;

-- 4. อัปเดต ID ใหม่ในตารางประวัติ
UPDATE "StatusHistory" s 
SET incident_id = m.new_id 
FROM id_map m 
WHERE s.incident_id = m.old_id;

-- 5. ล็อคความสัมพันธ์ระหว่างตารางให้เหมือนเดิม
ALTER TABLE "StatusHistory" 
ADD CONSTRAINT "StatusHistory_incident_id_fkey" 
FOREIGN KEY (incident_id) REFERENCES "Incidents"(incident_id) ON DELETE CASCADE;

COMMIT;
