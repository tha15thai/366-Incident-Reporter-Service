const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'incident_reporter',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('error', (err) => {
  console.error('❌ Unexpected DB error:', err);
});

const initializeDatabase = async () => {
  console.log('🔧 Initializing PostgreSQL database...\n');

  const client = await pool.connect();
  try {
    // ---- ENUM TYPES ----
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE incident_type_enum AS ENUM ('FLOOD','FIRE','EARTHQUAKE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE severity_enum AS ENUM ('CRITICAL','HIGH','MEDIUM','LOW');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE status_enum AS ENUM (
          'REPORTED','VERIFIED','DISPATCHED',
          'IN_PROGRESS','RESOLVED','CLOSED','REJECTED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE reporter_type_enum AS ENUM ('citizen','police','government_agency','other');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ---- TABLE: REPORTERS ----
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Reporters" (
        reporter_id   TEXT                PRIMARY KEY,
        name          TEXT                NOT NULL,
        phone_num     TEXT                NOT NULL,
        reporter_type reporter_type_enum  NOT NULL DEFAULT 'citizen'
      )
    `);
    console.log('✅ Table: REPORTERS');

    // ---- TABLE: INCIDENTS ----
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Incidents" (
        incident_id     TEXT               PRIMARY KEY,
        incident_type   incident_type_enum NOT NULL,
        severity        severity_enum      NOT NULL,
        status          status_enum        NOT NULL DEFAULT 'REPORTED',
        location        JSONB              NOT NULL,
        address_name    TEXT               NOT NULL,
        incident_start  TIMESTAMPTZ        NOT NULL,
        ended_time      TIMESTAMPTZ,
        description     TEXT               NOT NULL,
        reporter_id     TEXT               NOT NULL REFERENCES "Reporters"(reporter_id),
        report_channel  TEXT,
        image_urls      TEXT[]             DEFAULT '{}',
        created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Table: INCIDENTS');

    // ---- TABLE: STATUS_HISTORY ----
    await client.query(`
      CREATE TABLE IF NOT EXISTS "StatusHistory" (
        log_id       TEXT        PRIMARY KEY,
        incident_id  TEXT        NOT NULL REFERENCES "Incidents"(incident_id),
        status       status_enum NOT NULL,
        description  TEXT        NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by   TEXT        NOT NULL
      )
    `);
    console.log('✅ Table: STATUS_HISTORY');

    // ---- TABLE: IDEMPOTENCY_KEYS ----
    await client.query(`
      CREATE TABLE IF NOT EXISTS "IdempotencyKeys" (
        request_id   TEXT        PRIMARY KEY,
        incident_id  TEXT        NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Table: IDEMPOTENCY_KEYS');

    console.log('\n✅ Database initialization completed!\n');
  } finally {
    client.release();
  }
};

module.exports = { pool, initializeDatabase };
