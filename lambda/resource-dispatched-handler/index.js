const db = require('/opt/nodejs/shared/db');
const { publishIncidentStatusChanged } = require('/opt/nodejs/shared/sns-publisher');
const { generateLogId } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const messageId = record.messageId;

      const { incidentId, resourceType, quantity } = message;
      const client = await db.getClient();

      try {
        await client.query('BEGIN');

        const incidentResult = await client.query(
          'SELECT * FROM "Incidents" WHERE incident_id = $1 FOR UPDATE',
          [incidentId]
        );

        if (incidentResult.rows.length === 0) {
          throw new Error(`Incident ${incidentId} not found`);
        }

        const incident = incidentResult.rows[0];

        if (incident.status === 'DISPATCHED') {
          const now = new Date().toISOString();
          const logId = generateLogId();

          const updatedResult = await client.query(
            `UPDATE "Incidents" SET status = 'IN_PROGRESS', updated_at = $1 WHERE incident_id = $2 RETURNING *`,
            [now, incidentId]
          );

          await client.query(
            `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [logId, incidentId, 'IN_PROGRESS', 
             `ทรัพยากร ${resourceType} จำนวน ${quantity} เดินทางถึงแล้ว`, 
             now, 'SYSTEM-ResourceAllocation']
          );

          await client.query('COMMIT');

          const updatedIncident = updatedResult.rows[0];
          const locationGeoJSON = JSON.parse(
            (await client.query('SELECT ST_AsGeoJSON($1) as geojson', [updatedIncident.location])).rows[0].geojson
          );

          await publishIncidentStatusChanged({ ...updatedIncident, location: locationGeoJSON }, 'DISPATCHED');
        } else {
          await client.query('ROLLBACK');
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
