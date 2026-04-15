const db = require('/opt/nodejs/shared/db');
const { successResponse, errorResponse } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  try {
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
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected system error');
  }
};
