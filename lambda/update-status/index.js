const db = require('/opt/nodejs/shared/db');
const { publishIncidentStatusChanged } = require('/opt/nodejs/shared/sns-publisher');
const { generateLogId, successResponse, errorResponse, isValidTransition } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  try {
    const incidentId = event.pathParameters.incident_id;
    const body = JSON.parse(event.body);
    const adminId = event.headers['X-Admin-Id'] || event.headers['x-admin-id'];

    if (!body.status) {
      return errorResponse(400, 'VALIDATION_ERROR', 'status is required');
    }
    if (!adminId) {
      return errorResponse(403, 'ACCESS_DENIED', 'Admin authorization required');
    }

    const now = new Date().toISOString();
    const logId = generateLogId();
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const incidentResult = await client.query(
        'SELECT * FROM "Incidents" WHERE incident_id = $1 FOR UPDATE',
        [incidentId]
      );

      if (incidentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return errorResponse(404, 'INCIDENT_NOT_FOUND', `Incident with id ${incidentId} not found`);
      }

      const incident = incidentResult.rows[0];
      const oldStatus = incident.status;

      if (!isValidTransition(oldStatus, body.status)) {
        await client.query('ROLLBACK');
        return errorResponse(400, 'INVALID_STATUS_TRANSITION', 
          `Cannot change status from ${oldStatus} to ${body.status}`);
      }

      const updatedResult = await client.query(
        `UPDATE "Incidents" SET status = $1, updated_at = $2 WHERE incident_id = $3 RETURNING *`,
        [body.status, now, incidentId]
      );

      await client.query(
        `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [logId, incidentId, body.status, body.description || `เปลี่ยนสถานะเป็น ${body.status}`, now, adminId]
      );

      await client.query('COMMIT');

      const updatedIncident = updatedResult.rows[0];
      const locationGeoJSON = JSON.parse(
        (await client.query('SELECT ST_AsGeoJSON($1) as geojson', [updatedIncident.location])).rows[0].geojson
      );

      await publishIncidentStatusChanged({ ...updatedIncident, location: locationGeoJSON }, oldStatus);

      return successResponse(200, {
        incident_id: updatedIncident.incident_id,
        old_status: oldStatus,
        new_status: updatedIncident.status,
        updated_at: updatedIncident.updated_at,
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
