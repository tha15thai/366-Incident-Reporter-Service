const http = require('http');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:3000/api/v1';

// Helper function สำหรับเรียก API
function makeRequest(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(body)
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runDemo() {
  console.log('\n🎬 ========== DEMO START ==========\n');

  try {
    // ============ Test 1: Create Incident ============
    console.log('📝 Test 1: Creating new incident...');
    const requestId1 = uuidv4();
    
    const incident1Data = {
      reporter_id: '1103700123456',
      reporter_name: 'ธวัลหทัย เทียมทอง',
      phone: '0812345678',
      incident_type: 'FLOOD',
      location: {
        type: 'Point',
        coordinates: [100.608, 14.072]
      },
      description: 'น้ำท่วมสูงประมาณ 50 ซม. บริเวณตลาดรังสิต',
      severity: 'HIGH',
      report_channel: 'mobile_app',
      image_urls: ['https://example.com/flood1.jpg']
    };

    const result1 = await makeRequest('POST', '/incidents', incident1Data, {
      'X-Request-Id': requestId1
    });

    console.log('✅ Status:', result1.status);
    console.log('   Response:', result1.data);
    const incidentId1 = result1.data.incident_id;

    await delay(1000);

    // ============ Test 2: Idempotency Check ============
    console.log('\n🔁 Test 2: Testing idempotency (sending same request again)...');
    
    const result2 = await makeRequest('POST', '/incidents', incident1Data, {
      'X-Request-Id': requestId1
    });

    console.log('✅ Status:', result2.status);
    console.log('   Response:', result2.data);
    console.log('   ℹ️  Should return same incident_id:', incidentId1);

    await delay(1000);

    // ============ Test 3: Create Another Incident ============
    console.log('\n📝 Test 3: Creating EARTHQUAKE incident...');
    const requestId3 = uuidv4();
    
    const incident2Data = {
      reporter_id: '1103700654321',
      reporter_name: 'สมชาย ใจดี',
      phone: '0898765432',
      incident_type: 'EARTHQUAKE',
      location: {
        type: 'Point',
        coordinates: [100.523, 13.736]
      },
      description: 'แผ่นดินไหวขนาด 4.5 ริกเตอร์',
      report_channel: 'facebook'
    };

    const result3 = await makeRequest('POST', '/incidents', incident2Data, {
      'X-Request-Id': requestId3
    });

    console.log('✅ Status:', result3.status);
    console.log('   Response:', result3.data);
    const incidentId2 = result3.data.incident_id;

    await delay(1000);

    // ============ Test 4: Get All Incidents ============
    console.log('\n📋 Test 4: Getting all incidents...');
    
    const result4 = await makeRequest('GET', '/incidents');
    console.log('✅ Status:', result4.status);
    console.log('   Total incidents:', result4.data.total);

    await delay(1000);

    // ============ Test 5: Update Status (Valid) ============
    console.log('\n🔄 Test 5: Updating status REPORTED → VERIFIED...');
    
    const result5 = await makeRequest(
      'PUT', 
      `/incidents/${incidentId1}/status`,
      {
        status: 'VERIFIED',
        description: 'ตรวจสอบจากภาพถ่ายและพิกัดแล้ว'
      },
      {
        'X-Admin-Id': 'ADMIN001'
      }
    );

    console.log('✅ Status:', result5.status);
    console.log('   Response:', result5.data);

    await delay(1000);

    // ============ Test 6: Update Status Chain ============
    console.log('\n🔄 Test 6: Status chain VERIFIED → DISPATCHED → IN_PROGRESS...');
    
    const result6 = await makeRequest(
      'PUT',
      `/incidents/${incidentId1}/status`,
      { status: 'DISPATCHED', description: 'ส่งทีมกู้ภัยไปแล้ว' },
      { 'X-Admin-Id': 'ADMIN001' }
    );
    console.log('   DISPATCHED:', result6.status);

    await delay(500);

    const result7 = await makeRequest(
      'PUT',
      `/incidents/${incidentId1}/status`,
      { status: 'IN_PROGRESS', description: 'ทีมกำลังให้ความช่วยเหลือ' },
      { 'X-Admin-Id': 'ADMIN001' }
    );
    console.log('   IN_PROGRESS:', result7.status);

    await delay(1000);

    // ============ Test 7: Invalid Status Transition ============
    console.log('\n❌ Test 7: Testing invalid transition (IN_PROGRESS → VERIFIED)...');
    
    const result8 = await makeRequest(
      'PUT',
      `/incidents/${incidentId1}/status`,
      { status: 'VERIFIED' },
      { 'X-Admin-Id': 'ADMIN001' }
    );

    console.log('   Status:', result8.status, '(should be 400)');
    console.log('   Error:', result8.data.error);

    await delay(1000);

    // ============ Test 8: Get Event Log ============
    console.log('\n📡 Test 8: Checking event log...');
    
    const result9 = await makeRequest('GET', '/events/log');
    console.log('✅ Status:', result9.status);
    console.log('   Total events:', result9.data.total);
    console.log('\n   Recent events:');
    result9.data.events.slice(-3).forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.eventType} - ${event.messageId.substring(0, 8)}...`);
    });

    await delay(1000);

    // ============ Test 9: Get Incident by ID ============
    console.log('\n🔍 Test 9: Getting incident detail...');
    
    const result10 = await makeRequest('GET', `/incidents/${incidentId1}`);
    console.log('✅ Status:', result10.status);
    console.log('   Incident:', {
      id: result10.data.incident_id,
      type: result10.data.incident_type,
      status: result10.data.status,
      severity: result10.data.severity
    });

    console.log('\n🎉 ========== DEMO COMPLETED ==========\n');

  } catch (err) {
    console.error('\n❌ Demo failed:', err.message);
  }
}

// Run demo
console.log('⏳ Waiting for server to be ready...');
setTimeout(runDemo, 2000);
