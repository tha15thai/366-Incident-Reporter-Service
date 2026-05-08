const db = require('/opt/nodejs/shared/db');
const { publishIncidentStatusChanged } = require('/opt/nodejs/shared/sns-publisher');
const { generateLogId } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  console.log('Received Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      // 1. Extract raw message body depending on SNS or SQS
      let rawMessage = '';
      if (record.EventSource === 'aws:sns' || record.EventSubscriptionArn) {
        rawMessage = record.Sns.Message;
      } else if (record.eventSource === 'aws:sqs') {
        rawMessage = record.body;
      } else {
        console.warn('Unknown event source:', record);
        continue;
      }

      // 2. Parse Payload with fallback for literal newlines
      let payload;
      try {
        payload = JSON.parse(rawMessage);
      } catch (e) {
        try {
          const sanitized = rawMessage.replace(/\r?\n/g, ' ');
          payload = JSON.parse(sanitized);
          console.warn('Parsed JSON after sanitizing literal newlines');
        } catch (e2) {
          console.error('Invalid JSON payload:', rawMessage);
          continue;
        }
      }

      // 3. Normalize Incident ID (Handle Friend's format INC-0001)
      const rawIncidentId = payload.incidentId || payload.incident_id || payload.incident_Id;
      const incidentId = rawIncidentId ? rawIncidentId.replace(/-/g, '_') : null;
      const status = payload.status;
      
      if (!incidentId || !status) {
        console.warn('Skipping message: Missing incidentId or status');
        continue;
      }

      console.log(`Processing ${status} update for incident: ${incidentId}`);

      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        
        // 4. Lock row and validate state
        const incidentResult = await client.query('SELECT * FROM "Incidents" WHERE incident_id = $1 FOR UPDATE', [incidentId]);
        if (incidentResult.rows.length === 0) {
          console.error(`Incident ${incidentId} not found in DB`);
          await client.query('ROLLBACK');
          continue;
        }
        
        const incident = incidentResult.rows[0];
        const now = new Date().toISOString();
        const logId = generateLogId();
        let queryParams = [];
        let queryStr = '';
        let actionDescription = payload.description || '';
        let actionBy = payload.operatorId || payload.source_service || 'EXTERNAL_SYSTEM';

        // 5. State Machine Routing
        if (status === 'VERIFIED') {
          if (incident.status === 'VERIFIED' && incident.severity === payload.severity?.toUpperCase()) {
            console.log(`Incident ${incidentId} already VERIFIED with ${payload.severity}. Skipping.`);
            await client.query('ROLLBACK'); continue; 
          }
          if (incident.status !== 'REPORTED' && incident.status !== 'VERIFIED') {
            console.error(`Invalid state transition. Cannot move from ${incident.status} to VERIFIED.`);
            await client.query('ROLLBACK'); continue;
          }
          const severity = payload.severity?.toUpperCase() || 'HIGH';
          if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severity)) {
             console.error(`Invalid severity: ${severity}`);
             await client.query('ROLLBACK'); continue;
          }
          actionDescription = payload.description || `ยืนยันข่าวจริงและจัดระดับความรุนแรงเป็น ${severity}`;
          actionBy = payload.operatorId || 'PRIORITY_SORTER_SERVICE';
          queryStr = `UPDATE "Incidents" SET status = 'VERIFIED', severity = $1, description = $2, updated_at = $3 WHERE incident_id = $4 RETURNING *`;
          queryParams = [severity, actionDescription, now, incidentId];

        } else if (status === 'REJECTED') {
          if (incident.status === 'REJECTED') { 
            console.log(`Incident ${incidentId} already REJECTED. Skipping.`);
            await client.query('ROLLBACK'); continue; 
          }
          if (incident.status !== 'REPORTED') {
            console.error(`Invalid transition from ${incident.status} to REJECTED.`);
            await client.query('ROLLBACK'); continue;
          }
          actionDescription = actionDescription || 'ข้อมูลถูกปฏิเสธ (Fake News) จากหน่วยตรวจสอบข่าว';
          actionBy = payload.operatorId || 'NEWS_CHECKER_SERVICE';
          queryStr = `UPDATE "Incidents" SET status = 'REJECTED', description = $1, updated_at = $2 WHERE incident_id = $3 RETURNING *`;
          queryParams = [actionDescription, now, incidentId];

        } else if (status === 'IN_PROGRESS') {
          if (incident.status === 'IN_PROGRESS') {
            console.log(`Incident ${incidentId} already IN_PROGRESS. Skipping.`);
            await client.query('ROLLBACK'); continue;
          }
          if (incident.status !== 'VERIFIED') {
            console.error(`Invalid transition from ${incident.status} to IN_PROGRESS.`);
            await client.query('ROLLBACK'); continue;
          }
          actionDescription = actionDescription || 'มีการปรับสถานะเป็น IN_PROGRESS จากทีมงานภายนอก';
          queryStr = `UPDATE "Incidents" SET status = 'IN_PROGRESS', description = $1, updated_at = $2 WHERE incident_id = $3 RETURNING *`;
          queryParams = [actionDescription, now, incidentId];

        } else if (status === 'RESOLVED') {
          if (incident.status === 'RESOLVED') {
            console.log(`Incident ${incidentId} already RESOLVED. Skipping.`);
            await client.query('ROLLBACK'); continue;
          }
          if (incident.status !== 'IN_PROGRESS') {
             console.error(`Invalid transition from ${incident.status} to RESOLVED.`);
             await client.query('ROLLBACK'); continue;
          }
          actionDescription = payload.description || 'Incident completed by resource allocation service';
          actionBy = payload.source_service || 'RESOURCE_ALLOCATION_SERVICE';
          // Use provided completed_at or timestamp from friend's payload, fallback to now
          const endedTime = payload.completed_at || payload.timestamp || now;
          queryStr = `UPDATE "Incidents" SET status = 'RESOLVED', description = $1, ended_time = $2, updated_at = $3 WHERE incident_id = $4 RETURNING *`;
          queryParams = [actionDescription, endedTime, now, incidentId];

        } else {
           console.warn(`Unsupported status transition: ${status}`);
           await client.query('ROLLBACK');
           continue;
        }

        const updatedResult = await client.query(queryStr, queryParams);
        await client.query(
          `INSERT INTO "StatusHistory" (log_id, incident_id, status, description, created_at, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
          [logId, incidentId, status, actionDescription, now, actionBy]
        );
        await client.query('COMMIT');

        const updatedIncident = updatedResult.rows[0];
        const locationGeoJSON = JSON.parse((await client.query('SELECT ST_AsGeoJSON($1) as geojson', [updatedIncident.location])).rows[0].geojson);
        
        await publishIncidentStatusChanged({ ...updatedIncident, location: locationGeoJSON }, incident.status);
        console.log(`✅ Successfully updated ${incidentId} to ${status}`);

      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Database transaction error:', err);
        if (record.eventSource === 'aws:sqs') throw err; // Re-throw to DLQ logic for SQS
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing record:', error);
      if (record.eventSource === 'aws:sqs') throw error;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
