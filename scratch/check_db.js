const { Pool } = require('pg');

const pool = new Pool({
  host: 'incident-reporter-db.cgblvudjfygs.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'incident_db',
  user: 'user',
  password: 'password'
});

async function run() {
  const res = await pool.query("SELECT incident_id, status FROM \"Incidents\" WHERE incident_id = 'INC_0003'");
  console.log(res.rows);
  await pool.end();
}
run();
