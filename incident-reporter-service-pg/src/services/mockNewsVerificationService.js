/**
 * Mock News Verification Service
 * ===============================
 * จำลอง service ของเพื่อนที่ทำหน้าที่ตรวจสอบว่าข่าว/รายงานเหตุการณ์เป็นเรื่องจริงหรือไม่
 * 
 * ในระบบจริง: service นี้จะรับ incident ไปตรวจสอบและส่ง VERIFIED / REJECTED กลับมา
 * ใน mock นี้: จำลอง logic การตรวจสอบแบบง่าย เพื่อแสดงให้เห็นว่า service ของเราเชื่อมต่อได้
 * 
 * API Contract (ที่เพื่อนประกาศ):
 *   POST /fact-check/verify
 *   Body: { incident_id, incident_type, description, location, reported_at }
 *   Response: { incident_id, result: "VERIFIED" | "REJECTED", confidence: 0-1, reason: string }
 */

const MOCK_ENABLED = process.env.MOCK_NEWS_SERVICE === 'true' || true;
const MOCK_NEWS_SERVICE_URL = process.env.NEWS_VERIFICATION_SERVICE_URL || 'http://news-verification-service/fact-check/verify';

/**
 * เรียก News Verification Service เพื่อตรวจสอบความจริงของรายงาน
 * @param {object} incident - ข้อมูล incident ที่ต้องการตรวจสอบ
 * @returns {{ result: 'VERIFIED'|'REJECTED', confidence: number, reason: string }}
 */
const verifyIncident = async (incident) => {
  if (MOCK_ENABLED) {
    return mockVerify(incident);
  }

  // ถ้าเชื่อมต่อ service จริง
  try {
    const axios = require('axios');
    const response = await axios.post(MOCK_NEWS_SERVICE_URL, {
      incident_id:  incident.incident_id,
      incident_type: incident.incident_type,
      description:  incident.description,
      location:     incident.location,
      reported_at:  incident.created_at,
    }, { timeout: 5000 });

    return response.data;
  } catch (err) {
    console.error('❌ News Verification Service unreachable, falling back to mock:', err.message);
    return mockVerify(incident);
  }
};

/**
 * Mock logic: จำลองการตรวจสอบข่าว
 * Rules:
 *  - ถ้า description มีคำว่า "ทดสอบ" หรือ "test" → REJECTED (ข่าวปลอมชัดเจน)
 *  - EARTHQUAKE + CRITICAL → VERIFIED เลย (ความรุนแรงสูง ให้ผ่านทันที)
 *  - อื่นๆ → VERIFIED (ผ่าน 80% ในระบบจริงจะมีการตรวจสอบมากกว่านี้)
 */
const mockVerify = (incident) => {
  console.log(`\n🔍 [Mock News Verification Service] Checking incident: ${incident.incident_id}`);

  const desc = (incident.description || '').toLowerCase();

  if (desc.includes('ทดสอบ') || desc.includes('test') || desc.includes('fake')) {
    console.log(`   ❌ Result: REJECTED (suspicious keywords in description)`);
    return {
      incident_id: incident.incident_id,
      result:      'REJECTED',
      confidence:  0.95,
      reason:      'Description contains suspicious/test keywords',
      checked_by:  'MockNewsVerificationService',
      checked_at:  new Date().toISOString(),
    };
  }

  if (incident.severity === 'CRITICAL') {
    console.log(`   ✅ Result: VERIFIED (CRITICAL severity auto-approved)`);
    return {
      incident_id: incident.incident_id,
      result:      'VERIFIED',
      confidence:  0.90,
      reason:      'CRITICAL severity incident auto-verified for immediate response',
      checked_by:  'MockNewsVerificationService',
      checked_at:  new Date().toISOString(),
    };
  }

  console.log(`   ✅ Result: VERIFIED (passed basic checks)`);
  return {
    incident_id: incident.incident_id,
    result:      'VERIFIED',
    confidence:  0.80,
    reason:      'Incident passed basic verification checks',
    checked_by:  'MockNewsVerificationService',
    checked_at:  new Date().toISOString(),
  };
};

module.exports = { verifyIncident };
