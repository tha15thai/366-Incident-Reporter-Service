/* ======================================================
   Incident Reporter Portal – script.js
   ====================================================== */

/* ---------- State ---------- */
let selectedType = '';
// severity is always HIGH – hardcoded in hidden input

/* ---------- Config Panel ---------- */
function toggleConfig() {
  const body    = document.getElementById('configBody');
  const chevron = document.getElementById('configChevron');
  const open    = body.style.display === 'none';
  body.style.display = open ? 'block' : 'none';
  chevron.classList.toggle('open', open);
}

function getApiUrl() {
  const raw = document.getElementById('apiEndpoint').value.trim();
  return raw || null;
}

/* ---------- Incident Type ---------- */
function selectType(btn) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  selectedType = btn.dataset.value;
  document.getElementById('incidentType').value = selectedType;
  clearError('incidentTypeError');
}

/* ---------- Address Search (Nominatim / OpenStreetMap) ---------- */
async function searchAddress() {
  const query = document.getElementById('addressSearch').value.trim();
  if (!query) return;

  const btn     = document.getElementById('searchBtn');
  const btnText = document.getElementById('searchBtnText');
  const results = document.getElementById('searchResults');

  btn.disabled        = true;
  btnText.textContent = 'กำลังค้น...';
  results.style.display = 'none';
  results.innerHTML     = '';

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'th,en' } });
    const data = await res.json();

    results.style.display = 'block';

    if (!data || data.length === 0) {
      results.innerHTML = `<div class="search-empty">ไม่พบสถานที่ "${query}" – ลองค้นเป็นภาษาอังกฤษหรือใช้ชื่อสถานที่ที่ชัดเจนขึ้น</div>`;
      return;
    }

    data.forEach(place => {
      const lat  = parseFloat(place.lat).toFixed(5);
      const lon  = parseFloat(place.lon).toFixed(5);
      const name = place.display_name.split(',')[0];
      const addr = place.display_name;

      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <span class="result-icon">📍</span>
        <div class="result-main">
          <div class="result-name">${name}</div>
          <div class="result-addr">${addr}</div>
        </div>
        <span class="result-coords">${lat}, ${lon}</span>
      `;
      item.addEventListener('click', () => {
        document.getElementById('latitude').value   = lat;
        document.getElementById('longitude').value  = lon;
        document.getElementById('addressName').value = place.display_name;
        showMapPreview(lat, lon);
        clearError('latitudeError');
        clearError('longitudeError');
        results.style.display = 'none';
        document.getElementById('addressSearch').value = name;
      });
      results.appendChild(item);
    });

  } catch (err) {
    console.error('Nominatim error:', err);
    results.style.display = 'block';
    results.innerHTML = `<div class="search-empty">เกิดข้อผิดพลาด กรุณาตรวจสอบเครือข่ายและลองใหม่</div>`;
  } finally {
    btn.disabled        = false;
    btnText.textContent = 'ค้นหา';
  }
}

/* ---------- GPS ---------- */
function getGPS() {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์นี้ไม่รองรับ Geolocation');
    return;
  }
  const btn     = document.getElementById('gpsBtn');
  const btnText = document.getElementById('gpsBtnText');
  btn.disabled  = true;
  btnText.textContent = 'กำลังดึงตำแหน่ง...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      document.getElementById('latitude').value  = lat;
      document.getElementById('longitude').value = lng;
      showMapPreview(lat, lng);
      clearError('latitudeError');
      clearError('longitudeError');
      btn.disabled  = false;
      btnText.textContent = '✅ รับตำแหน่งแล้ว – กดอีกครั้งเพื่ออัปเดต';
    },
    (err) => {
      console.warn('GPS error:', err);
      btn.disabled  = false;
      btnText.textContent = '❌ ดึงตำแหน่งไม่สำเร็จ ลองใหม่';
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

function showMapPreview(lat, lng) {
  const preview   = document.getElementById('mapPreview');
  const coordText = document.getElementById('mapCoordText');
  const mapLink   = document.getElementById('mapLink');
  preview.style.display  = 'flex';
  coordText.textContent  = `${lat}, ${lng}`;
  mapLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
}

/* Update map preview when user types coordinates manually */
function watchCoords() {
  const latInput = document.getElementById('latitude');
  const lngInput = document.getElementById('longitude');
  [latInput, lngInput].forEach(el => {
    el.addEventListener('input', () => {
      const lat = parseFloat(latInput.value);
      const lng = parseFloat(lngInput.value);
      if (!isNaN(lat) && !isNaN(lng)) {
        showMapPreview(lat.toFixed(6), lng.toFixed(6));
      }
    });
  });

  // Enter key on search box
  document.getElementById('addressSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); searchAddress(); }
  });
}

/* ---------- Validation ---------- */
function validateForm() {
  let valid = true;

  const reporterId = document.getElementById('reporterId').value.trim();
  if (!reporterId) {
    showError('reporterIdError', 'กรุณากรอกรหัสประจำตัว');
    markError('reporterId');
    valid = false;
  } else {
    clearError('reporterIdError');
    clearError2('reporterId');
  }

  if (!selectedType) {
    showError('incidentTypeError', 'กรุณาเลือกประเภทภัยพิบัติ');
    valid = false;
  }

  const lat = document.getElementById('latitude').value.trim();
  const lng = document.getElementById('longitude').value.trim();
  if (!lat) {
    showError('latitudeError', 'กรุณากรอกละติจูด');
    markError('latitude');
    valid = false;
  } else if (isNaN(parseFloat(lat)) || parseFloat(lat) < -90 || parseFloat(lat) > 90) {
    showError('latitudeError', 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90');
    markError('latitude');
    valid = false;
  } else {
    clearError('latitudeError');
    clearError2('latitude');
  }

  if (!lng) {
    showError('longitudeError', 'กรุณากรอกลองจิจูด');
    markError('longitude');
    valid = false;
  } else if (isNaN(parseFloat(lng)) || parseFloat(lng) < -180 || parseFloat(lng) > 180) {
    showError('longitudeError', 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180');
    markError('longitude');
    valid = false;
  } else {
    clearError('longitudeError');
    clearError2('longitude');
  }

  return valid;
}

function showError(id, msg)  { document.getElementById(id).textContent = msg; }
function clearError(id)      { document.getElementById(id).textContent = ''; }
function markError(id)       { document.getElementById(id).classList.add('error'); }
function clearError2(id)     { document.getElementById(id).classList.remove('error'); }

/* ---------- Build Payload ---------- */
function buildPayload() {
  const lat = parseFloat(document.getElementById('latitude').value);
  const lng = parseFloat(document.getElementById('longitude').value);

  const payload = {
    reporter_id:    document.getElementById('reporterId').value.trim(),
    reporter_name:  document.getElementById('reporterName').value.trim() || 'Unknown',
    phone:          document.getElementById('reporterPhone').value.trim(),
    incident_type:  selectedType,
    location: {
      type:        'Point',
      coordinates: [lng, lat]   // GeoJSON: [longitude, latitude]
    },
    address_name:   document.getElementById('addressName').value.trim(),
    description:    document.getElementById('description').value.trim(),
    severity:       'HIGH',     // always HIGH – priority calculated by downstream service
    affected_count: parseInt(document.getElementById('affectedCount').value) || 0,
    report_channel: 'web_portal',
  };

  const incidentStart = document.getElementById('incidentStart').value;
  if (incidentStart) {
    payload.incident_start = new Date(incidentStart).toISOString();
  }

  // Clean empty strings
  Object.keys(payload).forEach(k => {
    if (payload[k] === '' || payload[k] === undefined) delete payload[k];
  });

  return payload;
}

/* ---------- Submit ---------- */
document.getElementById('incidentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) {
    const firstError = document.querySelector('.field-input.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const apiUrl = getApiUrl();
  if (!apiUrl) {
    document.getElementById('configBody').style.display = 'block';
    document.getElementById('configChevron').classList.add('open');
    document.getElementById('apiEndpoint').focus();
    document.getElementById('apiEndpoint').scrollIntoView({ behavior: 'smooth', block: 'center' });
    alert('กรุณากรอก API Endpoint ก่อน (คลิกที่ "ตั้งค่า API Endpoint" ด้านบน)');
    return;
  }

  setLoading(true);
  const payload = buildPayload();
  console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-Request-Id':  crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('📥 Response:', data);

    if (res.status === 201 || res.ok) {
      showSuccess(data);
    } else if (res.status === 409) {
      showApiError('มีรายงานเหตุการณ์ใกล้เคียงนี้ภายใน 10 นาทีแล้ว ระบบได้อัปเดตจำนวนรายงานให้อัตโนมัติ');
    } else {
      const msg = data?.error?.message || 'เกิดข้อผิดพลาด กรุณาตรวจสอบ API หรือลองใหม่';
      showApiError(msg);
    }
  } catch (err) {
    console.error('Fetch error:', err);
    showApiError('ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบ URL หรือเครือข่าย');
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  const btn     = document.getElementById('submitBtn');
  const text    = document.getElementById('submitText');
  const spinner = document.getElementById('submitSpinner');
  btn.disabled          = on;
  text.style.display    = on ? 'none' : 'flex';
  spinner.style.display = on ? 'flex' : 'none';
}

/* ---------- Result Display ---------- */
function showSuccess(data) {
  document.getElementById('incidentForm').style.display  = 'none';
  document.getElementById('resultPanel').style.display   = 'block';
  document.getElementById('resultSuccess').style.display = 'flex';
  document.getElementById('resultError').style.display   = 'none';

  const details = document.getElementById('resultDetails');
  details.innerHTML = '';

  if (data.incident_id) {
    const b = document.createElement('span');
    b.className = 'detail-badge id';
    b.textContent = data.incident_id;
    details.appendChild(b);
  }
  if (data.status) {
    const b = document.createElement('span');
    b.className = 'detail-badge status';
    b.textContent = data.status;
    details.appendChild(b);
  }
  if (data.severity) {
    const b = document.createElement('span');
    b.className = 'detail-badge sev';
    b.textContent = `Severity: ${data.severity}`;
    details.appendChild(b);
  }

  document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showApiError(msg) {
  document.getElementById('incidentForm').style.display  = 'none';
  document.getElementById('resultPanel').style.display   = 'block';
  document.getElementById('resultSuccess').style.display = 'none';
  document.getElementById('resultError').style.display   = 'flex';
  document.getElementById('errorMessage').textContent = msg;
  document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Reset / Retry ---------- */
function resetForm() {
  document.getElementById('incidentForm').reset();
  document.getElementById('incidentType').value = '';
  selectedType = '';
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('mapPreview').style.display    = 'none';
  document.getElementById('searchResults').style.display = 'none';
  document.getElementById('gpsBtnText').textContent = '📍 ใช้ตำแหน่งอุปกรณ์นี้ (ถ้าอยู่ในพื้นที่)';
  document.getElementById('resultPanel').style.display   = 'none';
  document.getElementById('incidentForm').style.display  = 'block';
  setDefaultDatetime();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function retryForm() {
  document.getElementById('resultPanel').style.display  = 'none';
  document.getElementById('incidentForm').style.display = 'block';
  document.getElementById('submitBtn').disabled = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Prefill datetime to now ---------- */
function setDefaultDatetime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('incidentStart').value = local;
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDatetime();
  watchCoords();
});
