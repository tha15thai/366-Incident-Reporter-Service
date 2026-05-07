const db = require('/opt/nodejs/shared/db');
const { publishIncidentStatusChanged } = require('/opt/nodejs/shared/sns-publisher');
const { generateLogId } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  console.log('Received SNS Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const snsMessage = record.Sns.Message;
      let payload;
      try {
        payload = JSON.parse(snsMessage);
      } catch (e) {
        try {
          // Fallback: sanitize literal newlines inside string values
          const sanitized = snsMessage.replace(/\r?\n/g, ' ');
          payload = JSON.parse(sanitized);
          console.warn('Parsed JSON after sanitizing literal newlines');
        } catch (e2) {
          console.error('Invalid JSON payload:', snsMessage);
          continue;
        }
      }

      const { status, description, operatorId } = payload;
      const incidentId = payload.incidentId || payload.incident_id || payload.incident_Id;

      if (!incidentId || status !== 'REJECTED') {
        console.warn('Skipping message: Missing incidentId or status is not REJECTED');
        continue;
      }

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        const incidentResult = await client.query(
          'SELECT * FROM "Incidents" WHERE incident_id = $1 FOR UPDATE',
          [incidentId]
        );

        if (incidentResult.rows.length === 0) {
          console.error(`Incident ${incidentId} not found`);
          await client.query('ROLLBACK');
          continue;
        }

        const incident = incidentResult.rows[0];

        if (incident.status === 'REJECTED') {
          console.log(`Incident ${incidentId} is already REJECTED. Skipping.`);
          await client.query('ROLLBACK');
          continue;
        }

        // Only allow rejection from REPORTED
        if (incident.status !== 'REPORTED') {
          console.error(`Invalid state transition. Cannot move from ${incident.status} to REJECTED for ${incidentId}`);
          await client.query('ROLLBACK');
          continue;
        }

        const now = new Date().toISOString();
        const logId = generateLogId();
        const actionDescription = description || 'ข้อมูลถูกปฏิเสธ (Fake News) จากหน่วยตรวจสอบข่าว';
        const actionBy = operatorId || 'NEWS_CHECKER_SERVICE';

        const updatedResult = await client.query(
          `UPDATE "Incidents" SET status = 'REJECTED', description = $1, updated_at = $2 WHERE incident_id = $3 RETURNING *`,
          [actionDescription, now, incidentId]
        );

        await client.query(
          `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [logId, incidentId, 'REJECTED', actionDescription, now, actionBy]
        );

        await client.query('COMMIT');

        const updatedIncident = updatedResult.rows[0];
        const locationGeoJSON = JSON.parse(
          (await client.query('SELECT ST_AsGeoJSON($1) as geojson', [updatedIncident.location])).rows[0].geojson
        );

        await publishIncidentStatusChanged({ ...updatedIncident, location: locationGeoJSON }, 'REPORTED');
        console.log(`Successfully updated ${incidentId} to REJECTED`);

      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database transaction error:', error);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing record:', error);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
