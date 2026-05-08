const https = require('https');

const data = JSON.stringify({
  status: 'IN_PROGRESS',
  description: 'Test transition to IN_PROGRESS'
});

const options = {
  hostname: 'p5d2n6hpw7.execute-api.us-east-1.amazonaws.com',
  port: 443,
  path: '/v1/incidents/INC_0003/status',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Id': 'ADMIN-TEST',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
