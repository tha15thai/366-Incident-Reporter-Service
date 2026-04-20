-- Diverse Seed Data for Incident Reporter
BEGIN;

-- Add More Reporters
INSERT INTO "Reporter" (reporter_id, name, phone_num, reporter_type) VALUES
('1112223334445', 'John Doe', '0811112222', 'citizen'),
('5554443332221', 'Jane Smith', '0899998888', 'citizen')
ON CONFLICT (reporter_id) DO NOTHING;

-- 1. FIRE at Siam Square (Critical, In Progress)
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC-FIRE-001', 'FIRE', 'CRITICAL', 'IN_PROGRESS', 
    ST_SetSRID(ST_MakePoint(100.5231, 13.7367), 4326),
    'Siam Square, Bangkok', CURRENT_TIMESTAMP - INTERVAL '2 hours',
    'Major fire in commercial building. Firefighters on site.', '1234567890123',
    150, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO NOTHING;

-- 2. FLOOD at Navanakorn (High, Dispatched)
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC-FLOOD-002', 'FLOOD', 'HIGH', 'DISPATCHED', 
    ST_SetSRID(ST_MakePoint(100.6080, 14.0720), 4326),
    'Navanakorn Industrial Estate, Pathum Thani', CURRENT_TIMESTAMP - INTERVAL '5 hours',
    'Flash flood reporting in Zone B. Pumps being deployed.', '9876543210987',
    45, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO NOTHING;

-- 3. EARTHQUAKE at Chiang Rai (Critical, Verified)
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC-QUAKE-003', 'EARTHQUAKE', 'CRITICAL', 'VERIFIED', 
    ST_SetSRID(ST_MakePoint(99.8400, 19.9100), 4326),
    'Chiang Rai City Center', CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    'Strong tremors felt. Minor damages to old buildings.', '1112223334445',
    200, CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO NOTHING;

-- 4. POWER OUTAGE at Rama 3 (Medium, Reported)
INSERT INTO "Incidents" (
    incident_id, incident_type, severity, status, location, 
    address_name, incident_start, description, reporter_id, 
    affected_count, created_at, updated_at
) VALUES (
    'INC-POWER-004', 'POWER_OUTAGE', 'MEDIUM', 'REPORTED', 
    ST_SetSRID(ST_MakePoint(100.5400, 13.7000), 4326),
    'Rama 3 Road, Bangkok', CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    'Total blackout in the area since 02:40 AM.', '5554443332221',
    1200, CURRENT_TIMESTAMP - INTERVAL '15 minutes', CURRENT_TIMESTAMP
) ON CONFLICT (incident_id) DO NOTHING;

-- Add History for some cases
INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by) VALUES
('LOG-F01', 'INC-FIRE-001', 'REPORTED', 'แจ้งเหตุไฟไหม้', CURRENT_TIMESTAMP - INTERVAL '115 minutes', 'USER-1234567890123'),
('LOG-F02', 'INC-FIRE-001', 'VERIFIED', 'ยืนยันเหตุการณ์จริง', CURRENT_TIMESTAMP - INTERVAL '110 minutes', 'SYSTEM'),
('LOG-F03', 'INC-FIRE-001', 'DISPATCHED', 'ส่งรถดับเพลิง 3 คัน', CURRENT_TIMESTAMP - INTERVAL '100 minutes', 'OPERATOR'),
('LOG-F04', 'INC-FIRE-001', 'IN_PROGRESS', 'กำลังควบคุมเพลิง', CURRENT_TIMESTAMP - INTERVAL '90 minutes', 'TEAM-A'),
('LOG-L01', 'INC-FLOOD-002', 'REPORTED', 'น้ำท่วมขังรอการระบาย', CURRENT_TIMESTAMP - INTERVAL '290 minutes', 'USER-9876543210987'),
('LOG-L02', 'INC-FLOOD-002', 'VERIFIED', 'ตรวจสอบพื้นที่พบน้ำท่วมจริง', CURRENT_TIMESTAMP - INTERVAL '280 minutes', 'SYSTEM'),
('LOG-L03', 'INC-FLOOD-002', 'DISPATCHED', 'ประสานงานกองบรรเทาสาธารณภัย', CURRENT_TIMESTAMP - INTERVAL '270 minutes', 'OPERATOR')
ON CONFLICT (log_id) DO NOTHING;

COMMIT;
