const db = require('/opt/nodejs/shared/db');
const { publishIncidentStatusChanged } = require('/opt/nodejs/shared/sns-publisher');
const { generateLogId } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  console.log('Received SNS Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      // 1. Parse SNS Message
      const snsMessage = record.Sns.Message;
      let payload;
      try {
        payload = JSON.parse(snsMessage);
      } catch (e) {
        console.error('Invalid JSON payload:', snsMessage);
        continue;
      }

      const { incidentId, status, description, operatorId } = payload;

      if (!incidentId || status !== 'IN_PROGRESS') {
        console.warn('Skipping message: Missing incidentId or status is not IN_PROGRESS');
        continue;
      }

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // 2. Check Data Integrity (Does the incident exist?) and State Validation
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

        // 3. Idempotency & State Validation Check
        // If it's already IN_PROGRESS, skip gracefully
        if (incident.status === 'IN_PROGRESS') {
          console.log(`Incident ${incidentId} is already IN_PROGRESS. Skipping.`);
          await client.query('ROLLBACK');
          continue;
        }

        // Only allow transition from VERIFIED
        if (incident.status !== 'VERIFIED') {
          console.error(`Invalid state transition. Cannot move from ${incident.status} to IN_PROGRESS for ${incidentId}`);
          await client.query('ROLLBACK');
          continue;
        }

        const now = new Date().toISOString();
        const logId = generateLogId();
        const actionDescription = description || 'มีการปรับสถานะเป็น IN_PROGRESS จากทีมงานภายนอก';
        const actionBy = operatorId || 'FRIEND_EXTERNAL_SYSTEM';

        // 4. Update Database & Write Audit Trail
        const updatedResult = await client.query(
          `UPDATE "Incidents" SET status = 'IN_PROGRESS', updated_at = $1 WHERE incident_id = $2 RETURNING *`,
          [now, incidentId]
        );

        await client.query(
          `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [logId, incidentId, 'IN_PROGRESS', actionDescription, now, actionBy]
        );

        await client.query('COMMIT');

        // 5. Publish Event internally so our system knows
        const updatedIncident = updatedResult.rows[0];
        const locationGeoJSON = JSON.parse(
          (await client.query('SELECT ST_AsGeoJSON($1) as geojson', [updatedIncident.location])).rows[0].geojson
        );

        await publishIncidentStatusChanged({ ...updatedIncident, location: locationGeoJSON }, 'VERIFIED');
        console.log(`Successfully updated ${incidentId} to IN_PROGRESS`);

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
