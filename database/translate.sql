BEGIN;

-- ปลดล็อค Constraint เดิมและใส่ตัวใหม่ที่รองรับคำว่า 'STORM'
ALTER TABLE "Incidents" DROP CONSTRAINT IF EXISTS "Incidents_incident_type_check";
ALTER TABLE "Incidents" ADD CONSTRAINT "Incidents_incident_type_check" CHECK (incident_type IN ('FLOOD', 'EARTHQUAKE', 'STORM'));

-- แปลง INC_0007
UPDATE "Incidents" SET 
    address_name = 'ตลาดสี่มุมเมือง, ปทุมธานี',
    description = 'เกิดเหตุเพลิงไหม้บริเวณตลาดสด กู้ภัยกำลังเข้าพื้นที่'
WHERE incident_id = 'INC_0007';

-- แปลง INC_0006
UPDATE "Incidents" SET 
    address_name = 'โรงงานรีไซเคิล, สมุทรปราการ',
    description = 'กลุ่มควันสีดำหนาแน่นบริเวณโรงงานขนาดใหญ่'
WHERE incident_id = 'INC_0006';

-- แปลง INC_0005
UPDATE "Incidents" SET 
    address_name = 'อาคารพาณิชย์ 3 ชั้น, เขตดินแดง กรุงเทพมหานคร',
    description = 'ไฟไหม้บริเวณชั้น 2 ของอาคารพาณิชย์ ไม่มีผู้ติดค้าง'
WHERE incident_id = 'INC_0005';

-- แปลง INC_0004
UPDATE "Incidents" SET 
    address_name = 'ถนนพระราม 3, เขตยานนาวา กรุงเทพมหานคร',
    description = 'เสาไฟฟ้าล้มและหม้อแปลงระเบิด ส่งผลให้ไฟดับเป็นวงกว้าง'
WHERE incident_id = 'INC_0004';

-- แปลง INC_0003
UPDATE "Incidents" SET 
    address_name = 'อ.แม่สาย, จังหวัดเชียงราย',
    description = 'เกิดแผ่นดินไหวขนาด 4.5 แมกนิจูด ประชาชนรับรู้แรงสั่นสะเทือนได้ชัดเจน'
WHERE incident_id = 'INC_0003';

-- แปลง INC_0002
UPDATE "Incidents" SET 
    address_name = 'ห้างสรรพสินค้าสยามสแควร์, กรุงเทพมหานคร',
    description = 'เกิดเหตุไฟฟ้าลัดวงจรและมีควันพวยพุ่งในร้านอาหาร เจ้าหน้าที่กำลังควบคุมเพลิง'
WHERE incident_id = 'INC_0002';

-- แปลง INC_0001 (เป็นข่าวพายุจากกรมอุตุฯ ตามที่ขอไว้เมื่อกี้)
UPDATE "Incidents" SET 
    incident_type = 'STORM', 
    address_name = 'ภาคเหนือ, กรุงเทพ, ภาคตะวันออก, ภาคกลาง, ภาคตะวันออกเฉียงเหนือ',
    description = 'พายุฤดูร้อนบริเวณประเทศไทยตอนบน (มีผลกระทบตั้งแต่วันที่ 23–25 เมษายน 2569) มีพายุฝนฟ้าคะนอง ลมกระโชกแรง ฟ้าผ่า ลูกเห็บตก'
WHERE incident_id = 'INC_0001';

COMMIT;
