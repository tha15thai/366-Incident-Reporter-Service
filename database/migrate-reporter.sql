ALTER TABLE "Reporter" ADD COLUMN IF NOT EXISTS password VARCHAR(255);
UPDATE "Incidents" SET reporter_id = '1234567890123' WHERE reporter_id = '9876543210987';
DELETE FROM "Reporter" WHERE reporter_id = '9876543210987';
UPDATE "Reporter" SET name = 'Kudo Shinichi', phone_num = '0800000001', reporter_type = 'government_agency', password = 'shinichi1234' WHERE reporter_id = '1234567890123';
