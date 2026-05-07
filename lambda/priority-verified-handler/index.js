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

      const { status, severity, description, operatorId } = payload;
      const incidentId = payload.incidentId || payload.incident_id || payload.incident_Id;

      if (!incidentId || status !== 'VERIFIED') {
        console.warn('Skipping message: Missing incidentId or status is not VERIFIED');
        continue;
      }

      if (!severity || !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severity.toUpperCase())) {
        console.error('Invalid severity provided:', severity);
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

        if (incident.status === 'VERIFIED' && incident.severity === severity.toUpperCase()) {
          console.log(`Incident ${incidentId} is already VERIFIED with severity ${severity}. Skipping.`);
          await client.query('ROLLBACK');
          continue;
        }

        // Only allow transition from REPORTED
        if (incident.status !== 'REPORTED' && incident.status !== 'VERIFIED') {
          console.error(`Invalid state transition. Cannot process from ${incident.status} for ${incidentId}`);
          await client.query('ROLLBACK');
          continue;
        }

        const now = new Date().toISOString();
        const logId = generateLogId();
        const actionDescription = description || `ยืนยันข่าวจริงและจัดระดับความรุนแรงเป็น ${severity.toUpperCase()}`;
        const actionBy = operatorId || 'PRIORITY_SORTER_SERVICE';

        const updatedResult = await client.query(
          `UPDATE "Incidents" SET status = 'VERIFIED', severity = $1, description = $2, updated_at = $3 WHERE incident_id = $4 RETURNING *`,
          [severity.toUpperCase(), actionDescription, now, incidentId]
        );

        await client.query(
          `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [logId, incidentId, 'VERIFIED', actionDescription, now, actionBy]
        );

        await client.query('COMMIT');

        const updatedIncident = updatedResult.rows[0];
        const locationGeoJSON = JSON.parse(
          (await client.query('SELECT ST_AsGeoJSON($1) as geojson', [updatedIncident.location])).rows[0].geojson
        );

        await publishIncidentStatusChanged({ ...updatedIncident, location: locationGeoJSON }, incident.status);
        console.log(`Successfully updated ${incidentId} to VERIFIED with severity ${severity}`);

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
