CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS "Reporter" (
    reporter_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_num VARCHAR(20) NOT NULL,
    reporter_type VARCHAR(50) NOT NULL CHECK (reporter_type IN ('citizen', 'police', 'government_agency', 'other'))
);

CREATE TABLE IF NOT EXISTS "Incidents" (
    incident_id VARCHAR(50) PRIMARY KEY,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('FLOOD', 'FIRE', 'EARTHQUAKE', 'POWER_OUTAGE', 'STORM')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('REPORTED', 'VERIFIED', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED')),
    location GEOMETRY(Point, 4326) NOT NULL,
    address_name VARCHAR(500),
    incident_start TIMESTAMP NOT NULL,
    ended_time TIMESTAMP,
    description TEXT,
    reporter_id VARCHAR(20) NOT NULL,
    report_channel VARCHAR(50) DEFAULT 'mobile_app',
    report_count INTEGER DEFAULT 1,
    affected_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES "Reporter"(reporter_id)
);

CREATE TABLE IF NOT EXISTS "StatusHistory" (
    log_id VARCHAR(50) PRIMARY KEY,
    incident_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('REPORTED', 'VERIFIED', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED')),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    FOREIGN KEY (incident_id) REFERENCES "Incidents"(incident_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incidents_location ON "Incidents" USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON "Incidents"(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON "Incidents"(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON "Incidents"(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON "Incidents"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_incident ON "StatusHistory"(incident_id, created_at);

INSERT INTO "Reporter" (reporter_id, name, phone_num, reporter_type) VALUES
('1234567890123', 'สมชาย ใจดี', '0812345678', 'citizen'),
('9876543210987', 'สมหญิง รักดี', '0898765432', 'citizen')
ON CONFLICT (reporter_id) DO NOTHING;

COMMIT;
