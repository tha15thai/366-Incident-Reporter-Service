-- Diverse Seed Data for Incident Reporter (Thai Content)
\encoding UTF8
BEGIN;

-- Add More Reporters
INSERT INTO "Reporter" (reporter_id, name, phone_num, reporter_type) VALUES
('1112223334445', 'สมชาย ใจดี', '0811112222', 'citizen'),
('5554443332221', 'สมหญิง รักชาติ', '0899998888', 'citizen'),
('9876543210987', 'สมศักดิ์ กล้าหาญ', '0866667777', 'citizen')
ON CONFLICT (reporter_id) DO NOTHING;

-- 1. STORM at Siam Square
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC_0001', 'STORM', 'CRITICAL', 'IN_PROGRESS', 
    ST_SetSRID(ST_MakePoint(100.5331, 13.7467), 4326),
    'สยามสแควร์ กรุงเทพมหานคร', CURRENT_TIMESTAMP - INTERVAL '130 minutes',
    'พายุเข้าอย่างหนัก ป้ายโฆษณาพังถล่มทับรถยนต์ มีผู้บาดเจ็บหลายราย', '1112223334445',
    15, CURRENT_TIMESTAMP - INTERVAL '120 minutes', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO UPDATE SET 
    incident_start = EXCLUDED.incident_start,
    created_at = EXCLUDED.created_at;

-- 2. FLOOD at Rangsit
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC_0002', 'FLOOD', 'HIGH', 'VERIFIED', 
    ST_SetSRID(ST_MakePoint(100.6180, 13.9820), 4326),
    'ฟิวเจอร์พาร์ค รังสิต ปทุมธานี', CURRENT_TIMESTAMP - INTERVAL '100 minutes',
    'น้ำท่วมขังสูงระดับเข่า รถเล็กไม่สามารถสัญจรได้', '9876543210987',
    45, CURRENT_TIMESTAMP - INTERVAL '90 minutes', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO UPDATE SET 
    incident_start = EXCLUDED.incident_start,
    created_at = EXCLUDED.created_at;

-- 3. EARTHQUAKE at Chiang Mai
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC_0003', 'EARTHQUAKE', 'CRITICAL', 'REPORTED', 
    ST_SetSRID(ST_MakePoint(98.9817, 18.7883), 4326),
    'ตัวเมืองเชียงใหม่', CURRENT_TIMESTAMP - INTERVAL '70 minutes',
    'แผ่นดินไหวรุนแรง อาคารเก่าเริ่มมีรอยร้าว ประชาชนแตกตื่น', '5554443332221',
    200, CURRENT_TIMESTAMP - INTERVAL '60 minutes', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO UPDATE SET 
    incident_start = EXCLUDED.incident_start,
    created_at = EXCLUDED.created_at;

-- 4. FLOOD at Yaowarat
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC_0004', 'FLOOD', 'HIGH', 'IN_PROGRESS', 
    ST_SetSRID(ST_MakePoint(100.5097, 13.7411), 4326),
    'ถนนเยาวราช กรุงเทพมหานคร', CURRENT_TIMESTAMP - INTERVAL '40 minutes',
    'น้ำท่วมฉับพลัน รถยนต์จมน้ำหลายคัน กำลังรอทีมช่วยเหลือ', '1112223334445',
    10, CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO UPDATE SET 
    incident_start = EXCLUDED.incident_start,
    created_at = EXCLUDED.created_at;

-- 5. STORM at Phuket
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC_0005', 'STORM', 'MEDIUM', 'RESOLVED', 
    ST_SetSRID(ST_MakePoint(98.3228, 7.8226), 4326),
    'เขาป่าตอง ภูเก็ต', CURRENT_TIMESTAMP - INTERVAL '25 minutes',
    'พายุเข้า ต้นไม้ล้มขวางถนน ตอนนี้เคลียร์เส้นทางเสร็จแล้ว', '9876543210987',
    0, CURRENT_TIMESTAMP - INTERVAL '15 minutes', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO UPDATE SET 
    incident_start = EXCLUDED.incident_start,
    created_at = EXCLUDED.created_at;

-- Add History for some cases
INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by) VALUES
('LOG_0001', 'INC_0001', 'REPORTED', 'แจ้งเหตุพายุเข้าที่สยาม', CURRENT_TIMESTAMP - INTERVAL '115 minutes', 'USER-1112223334445'),
('LOG_0002', 'INC_0001', 'VERIFIED', 'ศูนย์ตรวจสอบและยืนยันว่าเป็นพายุรุนแรง', CURRENT_TIMESTAMP - INTERVAL '110 minutes', 'SYSTEM'),
('LOG_0003', 'INC_0001', 'IN_PROGRESS', 'กำลังส่งทีมกู้ภัยเข้าพื้นที่', CURRENT_TIMESTAMP - INTERVAL '90 minutes', 'TEAM-A'),
('LOG_0004', 'INC_0002', 'REPORTED', 'แจ้งเหตุน้ำท่วมรังสิต', CURRENT_TIMESTAMP - INTERVAL '85 minutes', 'USER-9876543210987'),
('LOG_0005', 'INC_0002', 'VERIFIED', 'ตรวจสอบพื้นที่พบน้ำท่วมจริง', CURRENT_TIMESTAMP - INTERVAL '80 minutes', 'SYSTEM'),
('LOG_0006', 'INC_0005', 'REPORTED', 'แจ้งเหตุพายุเข้าป่าตอง', CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'USER-9876543210987'),
('LOG_0007', 'INC_0005', 'RESOLVED', 'เจ้าหน้าที่เคลียร์ต้นไม้ล้มออกจากถนนเรียบร้อยแล้ว', CURRENT_TIMESTAMP - INTERVAL '5 minutes', 'RESOURCE_TEAM')
ON CONFLICT (log_id) DO NOTHING;

COMMIT;
