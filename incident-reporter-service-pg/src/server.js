require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database/db');
const incidentRoutes = require('./routes/incidents');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Incident Reporter Service', timestamp: new Date().toISOString() });
});

// Service info
app.get('/', (req, res) => {
  res.json({
    service: 'Incident Reporter Service',
    version: 'v1',
    status:  'running',
    owner:   'Thawanhathai Thiamthong 6609650111',
    endpoints: {
      'POST   /incidents':                         'Create incident report',
      'PUT    /incidents/:id/status':              'Update incident status (with news verification on REPORTED→VERIFIED)',
      'GET    /incidents':                         'List all incidents (filter: ?status=&severity=&incident_type=)',
      'GET    /incidents/:id':                     'Get incident by ID',
      'GET    /incidents/:id/status-history':      'Audit trail of status changes',
      'GET    /reporters/:reporter_id':            'Get reporter info',
      'GET    /events/log':                        'Async event log',
      'GET    /debug/stats':                       'DB row counts',
      'GET    /health':                            'Health check',
    },
  });
});

// All routes (no /api/v1 prefix)
app.use('/', incidentRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

async function startServer() {
  try {
    console.log('🚀 Starting Incident Reporter Service...\n');
    await initializeDatabase();
    console.log('✅ Database ready\n');

    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📚 Endpoints:');
      console.log('   POST   /incidents');
      console.log('   PUT    /incidents/:id/status');
      console.log('   GET    /incidents');
      console.log('   GET    /incidents/:id');
      console.log('   GET    /incidents/:id/status-history');
      console.log('   GET    /reporters/:reporter_id');
      console.log('   GET    /events/log');
      console.log('   GET    /debug/stats');
      console.log('   GET    /health');
      console.log('\n💾 Database: PostgreSQL');
      console.log('\n💡 Ready for demo!\n');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
