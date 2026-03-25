const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const incidentService = require('../services/incidentService');
const { createIncidentSchema, updateStatusSchema } = require('../validators/schemas');
const eventBus = require('../events/eventBus');

const traceId = () => uuidv4();

// ============================================================
// POST /incidents  —  Create Incident Report
// ============================================================
router.post('/incidents', async (req, res) => {
  try {
    const { error, value } = createIncidentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.details[0].message, traceId: traceId() } });

    const requestId = req.headers['x-request-id'];
    if (!requestId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'X-Request-Id header is required', traceId: traceId() } });

    const result = await incidentService.createIncident(value, requestId);
    res.status(201).json(result);

  } catch (err) {
    console.error('Error creating incident:', err);
    if (err.code === 'DUPLICATE_INCIDENT') return res.status(409).json({ error: { code: err.code, message: err.message, traceId: traceId() } });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected system error', traceId: traceId() } });
  }
});

// ============================================================
// PUT /incidents/:incident_id/status  —  Update Incident Status
// ============================================================
router.put('/incidents/:incident_id/status', async (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];
    if (!adminId) return res.status(403).json({ error: { code: 'ACCESS_DENIED', message: 'Admin authorization required', traceId: traceId() } });

    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.details[0].message, traceId: traceId() } });

    const result = await incidentService.updateIncidentStatus(
      req.params.incident_id, value.status, value.description, adminId
    );
    res.status(200).json(result);

  } catch (err) {
    console.error('Error updating status:', err);
    if (err.code === 'INCIDENT_NOT_FOUND')       return res.status(404).json({ error: { code: err.code, message: err.message, traceId: traceId() } });
    if (err.code === 'INVALID_STATUS_TRANSITION') return res.status(400).json({ error: { code: err.code, message: err.message, traceId: traceId() } });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected system error', traceId: traceId() } });
  }
});

// ============================================================
// GET /incidents  —  List Incidents (with optional filters)
// ============================================================
router.get('/incidents', async (req, res) => {
  try {
    const incidents = await incidentService.getAllIncidents({
      status:        req.query.status,
      severity:      req.query.severity,
      incident_type: req.query.incident_type,
    });
    res.status(200).json({ total: incidents.length, incidents });
  } catch (err) {
    console.error('Error listing incidents:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected system error', traceId: traceId() } });
  }
});

// ============================================================
// GET /incidents/:incident_id  —  Get Incident by ID
// ============================================================
router.get('/incidents/:incident_id', async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.incident_id);
    if (!incident) return res.status(404).json({ error: { code: 'INCIDENT_NOT_FOUND', message: `Incident with id ${req.params.incident_id} not found`, traceId: traceId() } });
    res.status(200).json(incident);
  } catch (err) {
    console.error('Error getting incident:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected system error', traceId: traceId() } });
  }
});

// ============================================================
// GET /incidents/:incident_id/status-history  —  Audit Trail
// ============================================================
router.get('/incidents/:incident_id/status-history', async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.incident_id);
    if (!incident) return res.status(404).json({ error: { code: 'INCIDENT_NOT_FOUND', message: `Incident with id ${req.params.incident_id} not found`, traceId: traceId() } });

    const history = await incidentService.getStatusHistory(req.params.incident_id);
    res.status(200).json({ incident_id: req.params.incident_id, total: history.length, history });
  } catch (err) {
    console.error('Error getting status history:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected system error', traceId: traceId() } });
  }
});

// ============================================================
// GET /reporters/:reporter_id  —  Get Reporter Info
// ============================================================
router.get('/reporters/:reporter_id', async (req, res) => {
  try {
    const reporter = await incidentService.getReporterById(req.params.reporter_id);
    if (!reporter) return res.status(404).json({ error: { code: 'REPORTER_NOT_FOUND', message: `Reporter with id ${req.params.reporter_id} not found`, traceId: traceId() } });
    res.status(200).json(reporter);
  } catch (err) {
    console.error('Error getting reporter:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected system error', traceId: traceId() } });
  }
});

// ============================================================
// GET /events/log  —  Async Event Log (for demo/debug)
// ============================================================
router.get('/events/log', (req, res) => {
  const log = eventBus.getEventLog();
  res.status(200).json({ total: log.length, events: log });
});

// ============================================================
// GET /debug/stats  —  Database Stats
// ============================================================
router.get('/debug/stats', async (req, res) => {
  try {
    const stats = await incidentService.getDatabaseStats();
    res.status(200).json({ database: 'PostgreSQL', stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
