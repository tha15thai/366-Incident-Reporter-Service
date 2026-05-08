const db = require('/opt/nodejs/shared/db');
const { publishIncidentCreated, publishIncidentStatusChanged } = require('/opt/nodejs/shared/sns-publisher');
const {
  generateLogId,
  successResponse,
  errorResponse,
  calculateSeverity,
  checkDuplicate,
  isValidTransition
} = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  const { httpMethod, resource, pathParameters } = event;

  try {
    if (httpMethod === 'POST' && resource === '/incidents') {
      return await createIncident(event);
    } else if (httpMethod === 'GET' && resource === '/incidents') {
      return await listIncidents(event);
    } else if (httpMethod === 'GET' && resource === '/incidents/{incident_id}') {
      return await getIncident(event, pathParameters.incident_id);
    } else if (httpMethod === 'PATCH' && resource === '/incidents/{incident_id}/status') {
      return await updateStatus(event, pathParameters.incident_id);
    } else if (httpMethod === 'GET' && resource === '/incidents/{incident_id}/history') {
      return await getHistory(event, pathParameters.incident_id);
    } else {
      return errorResponse(404, 'NOT_FOUND', 'Route not found');
    }
  } catch (error) {
    console.error('Unhandled Error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected system error');
  }
};

// --------------------------------------------------------------------------
// 1. CREATE INCIDENT
// --------------------------------------------------------------------------
async function createIncident(event) {
  const body = JSON.parse(event.body);
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
  const logId = generateLogId();
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const countResult = await client.query('SELECT COUNT(*) FROM "Incidents"');
    const nextIdNumber = parseInt(countResult.rows[0].count, 10) + 1;
    const incidentId = `INC_${String(nextIdNumber).padStart(4, '0')}`;

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
}

// --------------------------------------------------------------------------
// 2. LIST INCIDENTS
// --------------------------------------------------------------------------
async function listIncidents(event) {
  const params = event.queryStringParameters || {};
  const limit = Math.min(parseInt(params.limit) || 50, 100);
  const offset = parseInt(params.offset) || 0;

  let whereClause = [];
  let queryParams = [];
  let paramIndex = 1;

  if (params.status) {
    whereClause.push(`i.status = $${paramIndex}`);
    queryParams.push(params.status);
    paramIndex++;
  }
  if (params.severity) {
    whereClause.push(`i.severity = $${paramIndex}`);
    queryParams.push(params.severity);
    paramIndex++;
  }
  if (params.incident_type) {
    whereClause.push(`i.incident_type = $${paramIndex}`);
    queryParams.push(params.incident_type);
    paramIndex++;
  }

  const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) as total FROM "Incidents" i ${whereSQL}`, queryParams);
  const total = parseInt(countResult.rows[0].total);

  const result = await db.query(
    `SELECT i.*, ST_AsGeoJSON(i.location)::json as location_geojson
     FROM "Incidents" i ${whereSQL} ORDER BY i.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  const items = result.rows.map(incident => ({
    incident_id: incident.incident_id,
    incident_type: incident.incident_type,
    severity: incident.severity,
    status: incident.status,
    location: incident.location_geojson,
    address_name: incident.address_name,
    incident_start: incident.incident_start,
    report_count: incident.report_count,
    affected_count: incident.affected_count,
    created_at: incident.created_at,
  }));

  return successResponse(200, { total, limit, offset, items });
}

// --------------------------------------------------------------------------
// 3. GET INCIDENT
// --------------------------------------------------------------------------
async function getIncident(event, incidentId) {
  const result = await db.query(
    `SELECT i.*, ST_AsGeoJSON(i.location)::json as location_geojson
     FROM "Incidents" i WHERE i.incident_id = $1`,
    [incidentId]
  );

  if (result.rows.length === 0) {
    return errorResponse(404, 'INCIDENT_NOT_FOUND', `Incident with id ${incidentId} not found`);
  }

  const incident = result.rows[0];
  return successResponse(200, {
    incident_id: incident.incident_id,
    incident_type: incident.incident_type,
    severity: incident.severity,
    status: incident.status,
    location: incident.location_geojson,
    address_name: incident.address_name,
    description: incident.description,
    incident_start: incident.incident_start,
    ended_time: incident.ended_time,
    reporter_id: incident.reporter_id,
    report_count: incident.report_count,
    affected_count: incident.affected_count,
    created_at: incident.created_at,
    updated_at: incident.updated_at,
  });
}

// --------------------------------------------------------------------------
// 4. UPDATE STATUS (Admin manual update)
// --------------------------------------------------------------------------
async function updateStatus(event, incidentId) {
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
}

// --------------------------------------------------------------------------
// 5. GET HISTORY
// --------------------------------------------------------------------------
async function getHistory(event, incidentId) {
  const incidentCheck = await db.query(
    'SELECT incident_id FROM "Incidents" WHERE incident_id = $1',
    [incidentId]
  );

  if (incidentCheck.rows.length === 0) {
    return errorResponse(404, 'INCIDENT_NOT_FOUND', `Incident with id ${incidentId} not found`);
  }

  const result = await db.query(
    `SELECT log_id, status, description, created_at, created_by
     FROM "StatusHistory" WHERE incident_id = $1 ORDER BY created_at ASC`,
    [incidentId]
  );

  return successResponse(200, {
    incident_id: incidentId,
    history: result.rows,
  });
}
