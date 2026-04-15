const db = require('/opt/nodejs/shared/db');
const { publishIncidentCreated } = require('/opt/nodejs/shared/sns-publisher');
const {
  generateIncidentId,
  generateLogId,
  successResponse,
  errorResponse,
  calculateSeverity,
  checkDuplicate,
} = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body);
    const requestId = event.headers['X-Request-Id'] || event.headers['x-request-id'];

    if (!body.reporter_id || !body.incident_type || !body.location) {
      return errorResponse(400, 'VALIDATION_ERROR', 'reporter_id, incident_type, and location are required');
    }

    const now = new Date().toISOString();
    const duplicate = await checkDuplicate(db, body.location, now);
    
    if (duplicate) {
      await db.query(
        `UPDATE "Incidents" SET report_count = report_count + 1, updated_at = $1 WHERE incident_id = $2`,
        [now, duplicate.incident_id]
      );
      return errorResponse(409, 'DUPLICATE_INCIDENT', 'Similar incident already reported in this area within 10 minutes');
    }

    const severity = body.severity || calculateSeverity(body.incident_type, body.affected_count || 0, 1);
    const incidentId = generateIncidentId();
    const logId = generateLogId();
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO "Reporter" (reporter_id, name, phone_num, reporter_type)
         VALUES ($1, $2, $3, $4) ON CONFLICT (reporter_id) DO NOTHING`,
        [body.reporter_id, body.reporter_name || 'Unknown', body.phone || '', 'citizen']
      );

      const incidentResult = await client.query(
        `INSERT INTO "Incidents" (
          incident_id, incident_type, severity, status, location, 
          address_name, incident_start, description, reporter_id, 
          report_channel, report_count, affected_count, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [incidentId, body.incident_type, severity, 'REPORTED', JSON.stringify(body.location),
         body.address_name || '', body.incident_start || now, body.description || '',
         body.reporter_id, body.report_channel || 'mobile_app', 1, body.affected_count || 0, now, now]
      );

      await client.query(
        `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [logId, incidentId, 'REPORTED', 'รับแจ้งเหตุจากผู้ประสบภัย', now, `USER-${body.reporter_id}`]
      );

      await client.query('COMMIT');

      const incident = incidentResult.rows[0];
      const locationGeoJSON = JSON.parse(
        (await client.query('SELECT ST_AsGeoJSON($1) as geojson', [incident.location])).rows[0].geojson
      );

      await publishIncidentCreated({ ...incident, location: locationGeoJSON });

      return successResponse(201, {
        incident_id: incident.incident_id,
        status: incident.status,
        severity: incident.severity,
        created_at: incident.created_at,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected system error');
  }
};
