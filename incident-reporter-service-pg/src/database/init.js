require('dotenv').config();
const { initializeDatabase, pool } = require('./db');

console.log('🔧 Initializing database...\n');

initializeDatabase()
  .then(() => {
    console.log('\n✅ Database initialization completed!');
    pool.end();
  })
  .catch((err) => {
    console.error('\n❌ Database initialization failed:', err);
    pool.end();
  });
