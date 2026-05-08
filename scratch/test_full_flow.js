const https = require('https');

const hostname = 'p5d2n6hpw7.execute-api.us-east-1.amazonaws.com';

function makeRequest(path, method, payload, headers) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const options = {
      hostname,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
        ...headers
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

async function runTest() {
  console.log("1. Creating new incident (REPORTED)...");
  const createPayload = {
    incident_type: 'FLOOD',
    description: 'ทดสอบสร้างเคสใหม่เพื่อส่งให้เพื่อนดู',
    location: { type: 'Point', coordinates: [100.5, 13.7] },
    reporter_id: 'USR_001'
  };
  
  const createRes = await makeRequest('/v1/incidents', 'POST', createPayload, {});
  console.log("Status:", createRes.statusCode);
  console.log("Response:", createRes.data);
  
  if (createRes.statusCode !== 201) {
    console.error("Failed to create incident!");
    return;
  }
  
  const incidentId = createRes.data.incident_id;
  console.log(`\n>> Incident created successfully: ${incidentId}`);
  
  console.log("\nWaiting 3 seconds before verifying...");
  await new Promise(r => setTimeout(r, 3000));
  
  console.log(`\n2. Updating ${incidentId} to VERIFIED...`);
  const updatePayload = {
    status: 'VERIFIED',
    description: 'ยืนยันเหตุการณ์นี้แล้ว'
  };
  
  const updateRes = await makeRequest(`/v1/incidents/${incidentId}/status`, 'PATCH', updatePayload, { 'X-Admin-Id': 'ADMIN-TEST' });
  console.log("Status:", updateRes.statusCode);
  console.log("Response:", updateRes.data);
  
  console.log("\n>> Test complete! Friend should have received 2 events:");
  console.log("1. IncidentCreated (from the first step)");
  console.log("2. IncidentStatusChanged (from the second step)");
}

runTest();
