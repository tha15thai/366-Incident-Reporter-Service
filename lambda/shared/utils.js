const { v4: uuidv4 } = require('uuid');

function generateIncidentId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INC${timestamp}${random}`;
}

function generateLogId() {
  return `LOG${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
}

function successResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Request-Id,X-Admin-Id',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function errorResponse(statusCode, code, message, traceId) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      error: {
        code,
        message,
        traceId: traceId || uuidv4(),
      },
    }),
  };
}

const VALID_TRANSITIONS = {
  REPORTED: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['DISPATCHED'],
  DISPATCHED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
};

function isValidTransition(currentStatus, newStatus) {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

function calculateSeverity(incidentType, affectedCount, reportCount) {
  if (affectedCount > 100 || reportCount > 10) return 'CRITICAL';
  if (affectedCount > 50 || reportCount > 5) return 'HIGH';
  if (affectedCount > 10 || reportCount > 2) return 'MEDIUM';
  return 'LOW';
}

async function checkDuplicate(db, location, timestamp) {
  const query = `
    SELECT incident_id, report_count
    FROM "Incidents"
    WHERE ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      1000
    )
    AND created_at >= $3 - INTERVAL '10 minutes'
    AND status NOT IN ('CLOSED', 'REJECTED')
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  const coords = location.coordinates;
  const result = await db.query(query, [coords[0], coords[1], timestamp]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

module.exports = {
  generateIncidentId,
  generateLogId,
  successResponse,
  errorResponse,
  isValidTransition,
  calculateSeverity,
  checkDuplicate,
};
