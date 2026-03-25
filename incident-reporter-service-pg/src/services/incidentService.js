const { pool } = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const eventBus = require('../events/eventBus');
const { verifyIncident } = require('./mockNewsVerificationService');

// State transition rules (ตาม PDF)
const VALID_TRANSITIONS = {
  'REPORTED':    ['VERIFIED', 'REJECTED'],
  'VERIFIED':    ['DISPATCHED'],
  'DISPATCHED':  ['IN_PROGRESS'],
  'IN_PROGRESS': ['RESOLVED'],
  'RESOLVED':    ['CLOSED'],
  'REJECTED':    [],
  'CLOSED':      [],
};

class IncidentService {

  // =============================================
  // API #1: Create Incident Report (Synchronous)
  // =============================================
  async createIncident(data, requestId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. เช็ค idempotency
      const existing = await this.checkIdempotencyKey(requestId, client);
      if (existing) {
        console.log(`⚠️  Duplicate request detected: ${requestId}`);
        await client.query('ROLLBACK');
        return existing;
      }

      // 2. เช็ค duplicate incident (location + 10 min window)
      const timeWindow = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const dupCheck = await client.query(
        `SELECT incident_id FROM "Incidents"
         WHERE (location->'coordinates'->>0)::float BETWEEN ($1::float - 0.01) AND ($1::float + 0.01)
           AND (location->'coordinates'->>1)::float BETWEEN ($2::float - 0.01) AND ($2::float + 0.01)
           AND created_at > $3
         LIMIT 1`,
        [data.location.coordinates[0], data.location.coordinates[1], timeWindow]
      );
      if (dupCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        throw { code: 'DUPLICATE_INCIDENT', message: 'Similar incident already reported in this area within 10 minutes' };
      }

      // 3. สร้าง/อัปเดต reporter (UPSERT)
      await client.query(
        `INSERT INTO "Reporters" (reporter_id, name, phone_num, reporter_type)
         VALUES ($1, $2, $3, 'citizen')
         ON CONFLICT (reporter_id) DO UPDATE SET name = EXCLUDED.name, phone_num = EXCLUDED.phone_num`,
        [data.reporter_id, data.reporter_name, data.phone]
      );

      // 4. คำนวณ severity อัตโนมัติ (ถ้าไม่ระบุ)
      const severity = data.severity || this.calculateSeverity(data);

      // 5. สร้าง incident
      const incidentId = this.generateIncidentId();
      const now = new Date().toISOString();
      const locationJson = JSON.stringify(data.location);

      await client.query(
        `INSERT INTO "Incidents" (
           incident_id, incident_type, severity, status,
           location, address_name, incident_start, ended_time,
           description, reporter_id, report_channel, image_urls,
           created_at, updated_at
         ) VALUES ($1,$2,$3,'REPORTED',$4,$5,$6,NULL,$7,$8,$9,$10,$11,$11)`,
        [
          incidentId,
          data.incident_type,
          severity,
          locationJson,
          data.address_name || 'Unknown',
          now,
          data.description,
          data.reporter_id,
          data.report_channel || 'api',
          data.image_urls || [],
          now,
        ]
      );

      // 6. บันทึก status history
      await client.query(
        `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
         VALUES ($1,$2,'REPORTED',$3,$4,'SYSTEM')`,
        [uuidv4(), incidentId, 'Initial report created', now]
      );

      // 7. บันทึก idempotency key
      await client.query(
        `INSERT INTO "IdempotencyKeys" (request_id, incident_id, created_at) VALUES ($1,$2,$3)`,
        [requestId, incidentId, now]
      );

      await client.query('COMMIT');

      // 8. Publish async event
      const incident = await this.getIncidentById(incidentId);
      eventBus.publishIncidentReported(incident);

      return { incident_id: incidentId, status: 'REPORTED', severity, created_at: now };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // =============================================
  // API #2: Update Incident Status (Synchronous)
  // =============================================
  async updateIncidentStatus(incidentId, newStatus, description, adminId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Optimistic locking: lock row
      const result = await client.query(
        `SELECT * FROM "Incidents" WHERE incident_id = $1 FOR UPDATE`,
        [incidentId]
      );
      const incident = result.rows[0];

      if (!incident) {
        await client.query('ROLLBACK');
        throw { code: 'INCIDENT_NOT_FOUND', message: `Incident with id ${incidentId} not found` };
      }

      // ตรวจสอบ state transition
      const validTransitions = VALID_TRANSITIONS[incident.status] || [];
      if (!validTransitions.includes(newStatus)) {
        await client.query('ROLLBACK');
        throw {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot change status from ${incident.status} to ${newStatus}`,
        };
      }

      // ========================================================
      // ขั้นตอนพิเศษ: REPORTED → VERIFIED
      // ต้องผ่านการตรวจสอบจาก News Verification Service ก่อน
      // ========================================================
      let finalStatus = newStatus;
      let verificationNote = description || `Status changed to ${newStatus}`;

      if (incident.status === 'REPORTED' && newStatus === 'VERIFIED') {
        console.log(`\n📰 Calling News Verification Service for incident ${incidentId}...`);
        const verifyResult = await verifyIncident(incident);

        if (verifyResult.result === 'REJECTED') {
          // เพื่อนบอกว่าข่าวปลอม → บังคับ REJECTED
          finalStatus = 'REJECTED';
          verificationNote = `Auto-rejected by News Verification Service: ${verifyResult.reason} (confidence: ${verifyResult.confidence})`;
          console.log(`   ⚠️  News service rejected → forcing REJECTED`);
        } else {
          verificationNote = `${description || 'Verified'} | News check: ${verifyResult.reason} (confidence: ${verifyResult.confidence})`;
          console.log(`   ✅ News service verified → proceeding to VERIFIED`);
        }
      }

      const oldStatus = incident.status;
      const now = new Date().toISOString();

      // อัปเดต status
      await client.query(
        `UPDATE "Incidents" SET status = $1, updated_at = $2 WHERE incident_id = $3`,
        [finalStatus, now, incidentId]
      );

      // บันทึก status history
      await client.query(
        `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), incidentId, finalStatus, verificationNote, now, adminId || 'ADMIN']
      );

      await client.query('COMMIT');

      // Publish async event
      const updatedIncident = await this.getIncidentById(incidentId);
      eventBus.publishIncidentStatusChanged(incidentId, oldStatus, finalStatus, updatedIncident);

      return { incident_id: incidentId, old_status: oldStatus, new_status: finalStatus, updated_at: now };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // =============================================
  // GET: Incident by ID
  // =============================================
  async getIncidentById(incidentId) {
    const result = await pool.query(
      `SELECT * FROM "Incidents" WHERE incident_id = $1`,
      [incidentId]
    );
    return result.rows[0] || null;
  }

  // =============================================
  // GET: All Incidents (with filters)
  // =============================================
  async getAllIncidents(filters = {}) {
    let sql = `SELECT * FROM "Incidents" WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (filters.status)        { sql += ` AND status = $${idx++}`;        params.push(filters.status); }
    if (filters.severity)      { sql += ` AND severity = $${idx++}`;      params.push(filters.severity); }
    if (filters.incident_type) { sql += ` AND incident_type = $${idx++}`; params.push(filters.incident_type); }

    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows;
  }

  // =============================================
  // GET: Status History for an Incident
  // =============================================
  async getStatusHistory(incidentId) {
    const result = await pool.query(
      `SELECT * FROM "StatusHistory" WHERE incident_id = $1 ORDER BY created_at ASC`,
      [incidentId]
    );
    return result.rows;
  }

  // =============================================
  // GET: Reporter by ID
  // =============================================
  async getReporterById(reporterId) {
    const result = await pool.query(
      `SELECT * FROM "Reporters" WHERE reporter_id = $1`,
      [reporterId]
    );
    return result.rows[0] || null;
  }

  // =============================================
  // GET: DB Stats (debug)
  // =============================================
  async getDatabaseStats() {
    const [inc, rep, hist, idem] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM "Incidents"`),
      pool.query(`SELECT COUNT(*) FROM "Reporters"`),
      pool.query(`SELECT COUNT(*) FROM "StatusHistory"`),
      pool.query(`SELECT COUNT(*) FROM "IdempotencyKeys"`),
    ]);
    return {
      incidents:       parseInt(inc.rows[0].count),
      reporters:       parseInt(rep.rows[0].count),
      status_history:  parseInt(hist.rows[0].count),
      idempotency_keys: parseInt(idem.rows[0].count),
    };
  }

  // =============== Helpers ===============

  async checkIdempotencyKey(requestId, client) {
    const key = await client.query(
      `SELECT * FROM "IdempotencyKeys" WHERE request_id = $1`,
      [requestId]
    );
    if (key.rows.length === 0) return null;

    const inc = await client.query(
      `SELECT * FROM "Incidents" WHERE incident_id = $1`,
      [key.rows[0].incident_id]
    );
    const i = inc.rows[0];
    return i ? { incident_id: i.incident_id, status: i.status, severity: i.severity, created_at: i.created_at } : null;
  }

  calculateSeverity(data) {
    if (data.incident_type === 'EARTHQUAKE') return 'CRITICAL';
    if (data.incident_type === 'FIRE')       return 'HIGH';
    return 'MEDIUM';
  }

  generateIncidentId() {
    const ts = Date.now().toString().slice(-6);
    return `INC${ts}`;
  }
}

module.exports = new IncidentService();
