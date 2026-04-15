const db = require('/opt/nodejs/shared/db');
const { successResponse, errorResponse } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  try {
    const incidentId = event.pathParameters.incident_id;
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
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected system error');
  }
};
