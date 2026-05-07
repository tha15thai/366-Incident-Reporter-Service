const db = require('/opt/nodejs/shared/db');
const { publishIncidentStatusChanged } = require('/opt/nodejs/shared/sns-publisher');
const { generateLogId } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  console.log('Received SQS Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      // 1. Parse SQS Message Body
      const rawBody = record.body;
      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        try {
          const sanitized = rawBody.replace(/\r?\n/g, ' ');
          payload = JSON.parse(sanitized);
          console.warn('Parsed JSON after sanitizing literal newlines');
        } catch (e2) {
          console.error('Invalid JSON payload:', rawBody);
          continue;
        }
      }

      // 2. Extract and normalize fields
      // Friend uses "INC-xxx" (hyphen) format, our DB uses "INC_xxx" (underscore)
      const rawIncidentId = payload.incident_id || payload.incidentId;
      const incidentId = rawIncidentId ? rawIncidentId.replace(/-/g, '_') : null;
      const status = payload.status;
      const description = payload.description || 'Incident completed by resource allocation service';
      const operatorId = payload.source_service || 'RESOURCE_ALLOCATION_SERVICE';

      // 3. Validate required fields
      if (!incidentId || status !== 'RESOLVED') {
        console.warn(`Skipping message: incidentId=${incidentId}, status=${status} (expected RESOLVED)`);
        continue;
      }

      console.log(`Processing RESOLVED update for incident: ${incidentId} (original: ${rawIncidentId})`);

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // 4. Check incident exists and current state
        const incidentResult = await client.query(
          'SELECT * FROM "Incidents" WHERE incident_id = $1 FOR UPDATE',
          [incidentId]
        );

        if (incidentResult.rows.length === 0) {
          console.error(`Incident ${incidentId} not found in DB`);
          await client.query('ROLLBACK');
          continue;
        }

        const incident = incidentResult.rows[0];

        // 5. Idempotency check
        if (incident.status === 'RESOLVED') {
          console.log(`Incident ${incidentId} is already RESOLVED. Skipping.`);
          await client.query('ROLLBACK');
          continue;
        }

        // 6. State validation: only allow RESOLVED from IN_PROGRESS
        if (incident.status !== 'IN_PROGRESS') {
          console.error(`Invalid state transition: ${incident.status} -> RESOLVED for ${incidentId}. Only IN_PROGRESS can be RESOLVED.`);
          await client.query('ROLLBACK');
          continue;
        }

        const now = new Date().toISOString();
        const logId = generateLogId();

        // 7. Update Incidents table - replace description with friend's message
        const updatedResult = await client.query(
          `UPDATE "Incidents"
           SET status = 'RESOLVED', description = $1, ended_time = $2, updated_at = $2
           WHERE incident_id = $3
           RETURNING *`,
          [description, now, incidentId]
        );

        // 8. Write audit trail to StatusHistory
        await client.query(
          `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [logId, incidentId, 'RESOLVED', description, now, operatorId]
        );

        await client.query('COMMIT');

        // 9. Publish internal event
        const updatedIncident = updatedResult.rows[0];
        const locationResult = await client.query(
          'SELECT ST_AsGeoJSON($1) as geojson',
          [updatedIncident.location]
        );
        const locationGeoJSON = JSON.parse(locationResult.rows[0].geojson);

        await publishIncidentStatusChanged(
          { ...updatedIncident, location: locationGeoJSON },
          'IN_PROGRESS'
        );

        console.log(`✅ Successfully updated ${incidentId} to RESOLVED`);

      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database transaction error:', error);
        // Re-throw so SQS knows to retry this message
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error processing SQS record:', error);
      throw error;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
