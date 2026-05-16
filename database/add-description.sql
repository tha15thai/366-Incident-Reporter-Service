-- เพิ่ม description ใน Incidents ถ้ายังไม่มี
ALTER TABLE "Incidents" ADD COLUMN IF NOT EXISTS description TEXT;

-- อัปเดต description ของ Incidents ที่มีอยู่แล้วให้มีค่าเริ่มต้น
UPDATE "Incidents" SET description = 'รับแจ้งเหตุจากระบบ' WHERE description IS NULL;

-- อัปเดต StatusHistory ให้มี description สำหรับ record ที่ว่างอยู่
UPDATE "StatusHistory" SET description = 'รับแจ้งเหตุจากผู้ประสบภัย' WHERE description IS NULL OR description = '';
