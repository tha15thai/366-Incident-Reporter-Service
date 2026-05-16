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
        // Direct SNS trigger
        rawMessage = record.Sns.Message;
      } else if (record.eventSource === 'aws:sqs') {
        // SNS → SQS → Lambda: body อาจเป็น SNS Notification wrapper (2 ชั้น)
        let bodyParsed;
        try { bodyParsed = JSON.parse(record.body); } catch (_) { bodyParsed = {}; }

        if (bodyParsed.Type === 'Notification' && bodyParsed.Message) {
          // แกะชั้นนอก SNS wrapper → เอา Message ข้างใน
          rawMessage = bodyParsed.Message;
          console.log('Unwrapped SNS-over-SQS from topic:', bodyParsed.TopicArn);
        } else {
          // SQS ส่งตรง (ไม่ผ่าน SNS)
          rawMessage = record.body;
        }
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

      // 3. Normalize Incident ID and fields (Handle varied formats from different services)
      const rawIncidentId = payload.incidentId || payload.incident_id || payload.incident_Id
        || payload.IncidentId || payload.id;
      const incidentId = rawIncidentId ? rawIncidentId.replace(/-/g, '_').toUpperCase() : null;
      const status = payload.status || payload.newStatus || payload.new_status;
      // Field aliases from various services (News Checker may use 'reason', 'checkedBy', etc.)
      if (!payload.description && (payload.reason || payload.note || payload.message)) {
        payload.description = payload.reason || payload.note || payload.message;
      }
      if (!payload.operatorId && (payload.checkedBy || payload.checked_by || payload.operator || payload.agentId)) {
        payload.operatorId = payload.checkedBy || payload.checked_by || payload.operator || payload.agentId;
      }

      if (!incidentId || !status) {
        console.warn('Skipping message: Missing incidentId or status', payload);
        continue;
      }

      // --- New Validation: Fail Fast for invalid ID formats ---
      if (!incidentId.match(/^INC_\d{4}$/) && !incidentId.match(/^INC[A-Z0-9]{12}$/)) {
        console.warn(`Skipping message: Invalid incidentId format (${incidentId})`);
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
          // News Checker can reject from REPORTED (or VERIFIED if false alarm)
          if (!['REPORTED', 'VERIFIED'].includes(incident.status)) {
            console.error(`Invalid transition from ${incident.status} to REJECTED.`);
            await client.query('ROLLBACK'); continue;
          }
          actionDescription = payload.description || 'ข้อมูลถูกปฏิเสธ (Fake News) จากหน่วยตรวจสอบข่าว';
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
        if (client) await client.query('ROLLBACK');
        console.error('Database transaction error:', err);
        if (record.eventSource === 'aws:sqs' || record.EventSource === 'aws:sns' || record.eventSource === 'aws:sqs') throw err; 
      } finally {
        if (client) client.release();
      }
    } catch (error) {
      console.error('Error processing record:', error);
      // Ensure SQS retries on unexpected errors (outside the DB block)
      const isSqs = record.eventSource === 'aws:sqs' || record.eventSource === 'aws:sqs';
      if (isSqs) throw error;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
