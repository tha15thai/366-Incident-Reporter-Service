const db = require('/opt/nodejs/shared/db');
const { successResponse, errorResponse } = require('/opt/nodejs/shared/utils');

exports.handler = async (event) => {
  try {
    const incidentId = event.pathParameters.incident_id;

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
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected system error');
  }
};
