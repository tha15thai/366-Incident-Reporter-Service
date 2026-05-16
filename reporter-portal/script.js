/* ======================================================
   Incident Reporter Portal – script.js (v2)
   ====================================================== */

const API_BASE = 'https://dcvvgbft6j.execute-api.us-east-1.amazonaws.com/v1/incidents';

// ─── Hardcoded credentials (stored in DB as Reporter) ───
const USERS = {
  kudoshinichi: { password: 'shinichi1234', reporter_id: '1234567890123', name: 'คุโด้ ชินอิจิ' }
};

let selectedType = '';
let allIncidents = [];
let currentEditId = null;

// ─────────────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');
  const btn       = document.getElementById('loginBtn');

  btn.disabled = true;
  errorEl.textContent = '';

  const user = USERS[username];
  if (!user || user.password !== password) {
    errorEl.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    btn.disabled = false;
    return;
  }

  sessionStorage.setItem('user', JSON.stringify({ username, ...user }));
  btn.disabled = false;
  showApp();
}

function handleLogout() {
  sessionStorage.removeItem('user');
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';
}

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; }
}

function showApp() {
  const user = getSession();
  if (!user) return;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('headerUserName').textContent = user.name;
  setDefaultDatetime();
  watchCoords();
  showPage('report');
}

// ─────────────────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────────────────
function showPage(page) {
  document.getElementById('pageReport').style.display    = page === 'report'    ? 'block' : 'none';
  document.getElementById('pageDashboard').style.display = page === 'dashboard' ? 'block' : 'none';
  document.getElementById('navReport').classList.toggle('active',    page === 'report');
  document.getElementById('navDashboard').classList.toggle('active', page === 'dashboard');
  if (page === 'dashboard') loadDashboard();
}

// ─────────────────────────────────────────────────────────
//  INCIDENT FORM
// ─────────────────────────────────────────────────────────
function selectType(btn) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  selectedType = btn.dataset.value;
  document.getElementById('incidentType').value = selectedType;
  clearError('incidentTypeError');
}

async function searchAddress() {
  const query = document.getElementById('addressSearch').value.trim();
  if (!query) return;
  const btn     = document.getElementById('searchBtn');
  const btnText = document.getElementById('searchBtnText');
  const results = document.getElementById('searchResults');
  btn.disabled = true;
  btnText.textContent = 'กำลังค้น...';
  results.style.display = 'none';
  results.innerHTML = '';
  try {
    const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'th,en' } });
    const data = await res.json();
    results.style.display = 'block';
    if (!data || data.length === 0) {
      results.innerHTML = `<div class="search-empty">ไม่พบสถานที่ "${query}" – ลองค้นเป็นภาษาอังกฤษหรือใช้ชื่อที่ชัดเจนขึ้น</div>`;
      return;
    }
    data.forEach(place => {
      const lat  = parseFloat(place.lat).toFixed(5);
      const lon  = parseFloat(place.lon).toFixed(5);
      const name = place.display_name.split(',')[0];
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `<span class="result-icon">📍</span><div class="result-main"><div class="result-name">${name}</div><div class="result-addr">${place.display_name}</div></div><span class="result-coords">${lat}, ${lon}</span>`;
      item.addEventListener('click', () => {
        document.getElementById('latitude').value   = lat;
        document.getElementById('longitude').value  = lon;
        document.getElementById('addressName').value = place.display_name;
        showMapPreview(lat, lon);
        clearError('latitudeError'); clearError('longitudeError');
        results.style.display = 'none';
        document.getElementById('addressSearch').value = name;
      });
      results.appendChild(item);
    });
  } catch (err) {
    results.style.display = 'block';
    results.innerHTML = `<div class="search-empty">เกิดข้อผิดพลาด กรุณาตรวจสอบเครือข่ายและลองใหม่</div>`;
  } finally {
    btn.disabled = false;
    btnText.textContent = 'ค้นหา';
  }
}

function getGPS() {
  if (!navigator.geolocation) { alert('เบราว์เซอร์นี้ไม่รองรับ Geolocation'); return; }
  const btn = document.getElementById('gpsBtn');
  const btnText = document.getElementById('gpsBtnText');
  btn.disabled = true;
  btnText.textContent = 'กำลังดึงตำแหน่ง...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      document.getElementById('latitude').value  = lat;
      document.getElementById('longitude').value = lng;
      showMapPreview(lat, lng);
      clearError('latitudeError'); clearError('longitudeError');
      btn.disabled = false;
      btnText.textContent = '✅ รับตำแหน่งแล้ว – กดอีกครั้งเพื่ออัปเดต';
    },
    () => { btn.disabled = false; btnText.textContent = '❌ ดึงตำแหน่งไม่สำเร็จ ลองใหม่'; },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

function showMapPreview(lat, lng) {
  const preview = document.getElementById('mapPreview');
  document.getElementById('mapCoordText').textContent = `${lat}, ${lng}`;
  document.getElementById('mapLink').href = `https://www.google.com/maps?q=${lat},${lng}`;
  preview.style.display = 'flex';
}

function watchCoords() {
  const latInput = document.getElementById('latitude');
  const lngInput = document.getElementById('longitude');
  [latInput, lngInput].forEach(el => {
    el.addEventListener('input', () => {
      const lat = parseFloat(latInput.value), lng = parseFloat(lngInput.value);
      if (!isNaN(lat) && !isNaN(lng)) showMapPreview(lat.toFixed(6), lng.toFixed(6));
    });
  });
  document.getElementById('addressSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); searchAddress(); }
  });
}

function validateForm() {
  let valid = true;
  if (!selectedType) { showError('incidentTypeError', 'กรุณาเลือกประเภทภัยพิบัติ'); valid = false; }
  const lat = document.getElementById('latitude').value.trim();
  const lng = document.getElementById('longitude').value.trim();
  if (!lat) { showError('latitudeError', 'กรุณากรอกละติจูด'); markError('latitude'); valid = false; }
  else if (parseFloat(lat) < -90 || parseFloat(lat) > 90) { showError('latitudeError', 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90'); markError('latitude'); valid = false; }
  else { clearError('latitudeError'); clearError2('latitude'); }
  if (!lng) { showError('longitudeError', 'กรุณากรอกลองจิจูด'); markError('longitude'); valid = false; }
  else if (parseFloat(lng) < -180 || parseFloat(lng) > 180) { showError('longitudeError', 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180'); markError('longitude'); valid = false; }
  else { clearError('longitudeError'); clearError2('longitude'); }
  return valid;
}

function showError(id, msg)  { const el = document.getElementById(id); if (el) el.textContent = msg; }
function clearError(id)      { const el = document.getElementById(id); if (el) el.textContent = ''; }
function markError(id)       { const el = document.getElementById(id); if (el) el.classList.add('error'); }
function clearError2(id)     { const el = document.getElementById(id); if (el) el.classList.remove('error'); }

document.addEventListener('DOMContentLoaded', () => {
  const user = getSession();
  if (user) { showApp(); } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
  }
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('incidentForm').addEventListener('submit', handleFormSubmit);
});

async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) {
    const firstError = document.querySelector('.field-input.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const user = getSession();
  const lat  = parseFloat(document.getElementById('latitude').value);
  const lng  = parseFloat(document.getElementById('longitude').value);
  const payload = {
    reporter_id:    user.reporter_id,
    reporter_name:  user.name,
    incident_type:  selectedType,
    location:       { type: 'Point', coordinates: [lng, lat] },
    address_name:   document.getElementById('addressName').value.trim(),
    description:    document.getElementById('description').value.trim(),
    affected_count: parseInt(document.getElementById('affectedCount').value) || 0,
    report_channel: 'web_portal',
  };
  const incidentStart = document.getElementById('incidentStart').value;
  if (incidentStart) payload.incident_start = new Date(incidentStart).toISOString();
  Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });

  setLoading(true);
  console.log('📤 Sending:', JSON.stringify(payload, null, 2));
  try {
    const res  = await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-Id': crypto.randomUUID() }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (res.status === 201 || res.ok) showSuccess(data);
    else if (res.status === 409) showApiError('มีรายงานเหตุการณ์ใกล้เคียงนี้ภายใน 10 นาทีแล้ว');
    else showApiError(data?.error?.message || 'เกิดข้อผิดพลาด');
  } catch (err) {
    showApiError('ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบเครือข่าย');
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  document.getElementById('submitBtn').disabled = on;
  document.getElementById('submitText').style.display    = on ? 'none' : 'flex';
  document.getElementById('submitSpinner').style.display = on ? 'flex' : 'none';
}

function showSuccess(data) {
  document.getElementById('incidentForm').style.display  = 'none';
  document.getElementById('resultPanel').style.display   = 'block';
  document.getElementById('resultSuccess').style.display = 'flex';
  document.getElementById('resultError').style.display   = 'none';
  const details = document.getElementById('resultDetails');
  details.innerHTML = '';
  if (data.incident_id) { const b = document.createElement('span'); b.className = 'detail-badge id'; b.textContent = data.incident_id; details.appendChild(b); }
  if (data.status)      { const b = document.createElement('span'); b.className = 'detail-badge status'; b.textContent = data.status; details.appendChild(b); }
  document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showApiError(msg) {
  document.getElementById('incidentForm').style.display  = 'none';
  document.getElementById('resultPanel').style.display   = 'block';
  document.getElementById('resultSuccess').style.display = 'none';
  document.getElementById('resultError').style.display   = 'flex';
  document.getElementById('errorMessage').textContent    = msg;
  document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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

function setDefaultDatetime() {
  const now = new Date(), pad = n => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const el = document.getElementById('incidentStart');
  if (el) el.value = local;
}

// ─────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────
async function loadDashboard() {
  document.getElementById('tableLoading').style.display = 'flex';
  document.getElementById('tableWrap').style.display   = 'none';
  document.getElementById('tableEmpty').style.display  = 'none';
  resetStats();

  try {
    const res  = await fetch(`${API_BASE}?limit=200`);
    const data = await res.json();
    allIncidents = data.items || [];
    updateStats(allIncidents);
    renderTable(allIncidents);
  } catch (err) {
    console.error('Dashboard load error:', err);
  } finally {
    document.getElementById('tableLoading').style.display = 'none';
  }
}

function resetStats() {
  ['statTotal','statReported','statVerified','statInProgress','statResolved','statRejected']
    .forEach(id => { document.getElementById(id).textContent = '–'; });
}

function updateStats(incidents) {
  const count = (status) => incidents.filter(i => i.status === status).length;
  document.getElementById('statTotal').textContent      = incidents.length;
  document.getElementById('statReported').textContent   = count('REPORTED');
  document.getElementById('statVerified').textContent   = count('VERIFIED');
  document.getElementById('statInProgress').textContent = count('IN_PROGRESS');
  document.getElementById('statResolved').textContent   = count('RESOLVED');
  document.getElementById('statRejected').textContent   = count('REJECTED');
}

function applyFilter() {
  const statusFilter = document.getElementById('filterStatus').value;
  const typeFilter   = document.getElementById('filterType').value;
  const filtered = allIncidents.filter(i => {
    return (!statusFilter || i.status === statusFilter) && (!typeFilter || i.incident_type === typeFilter);
  });
  renderTable(filtered);
}

function renderTable(incidents) {
  const tbody = document.getElementById('incidentsTableBody');
  tbody.innerHTML = '';

  if (incidents.length === 0) {
    document.getElementById('tableWrap').style.display  = 'none';
    document.getElementById('tableEmpty').style.display = 'flex';
    return;
  }

  document.getElementById('tableWrap').style.display  = 'block';
  document.getElementById('tableEmpty').style.display = 'none';

  const typeEmoji = { FLOOD: '🌊', EARTHQUAKE: '🏚️', STORM: '🌪️' };
  const typeName  = { FLOOD: 'น้ำท่วม', EARTHQUAKE: 'แผ่นดินไหว', STORM: 'พายุ' };
  const statusClass = { REPORTED: 'badge-reported', VERIFIED: 'badge-verified', IN_PROGRESS: 'badge-inprogress', RESOLVED: 'badge-resolved', REJECTED: 'badge-rejected' };
  const sevClass = { CRITICAL: 'sev-critical', HIGH: 'sev-high', MEDIUM: 'sev-medium', LOW: 'sev-low' };

  incidents.forEach(inc => {
    const tr = document.createElement('tr');
    const updatedDate = new Date(inc.updated_at || inc.created_at).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const emoji = typeEmoji[inc.incident_type] || '❓';
    const tname = typeName[inc.incident_type] || inc.incident_type;
    const sbadge = statusClass[inc.status] || '';
    const sevbadge = inc.severity ? `<span class="sev-badge ${sevClass[inc.severity] || ''}">${inc.severity}</span>` : '<span class="sev-badge sev-none">–</span>';
    const desc = inc.description ? inc.description.substring(0, 50) + (inc.description.length > 50 ? '…' : '') : '–';
    // Store coords for edit modal (from location object)
    const lng = inc.location?.coordinates?.[0] ?? '';
    const lat = inc.location?.coordinates?.[1] ?? '';

    tr.innerHTML = `
      <td><span class="incident-id">${inc.incident_id}</span></td>
      <td><span class="type-badge">${emoji} ${tname}</span></td>
      <td class="addr-cell" title="${inc.address_name || ''}">${inc.address_name || '–'}</td>
      <td class="num-cell">${inc.affected_count?.toLocaleString() || 0}</td>
      <td><span class="status-badge ${sbadge}">${inc.status}</span></td>
      <td>${sevbadge}</td>
      <td class="desc-cell" title="${inc.description || ''}">${desc}</td>
      <td class="date-cell">${updatedDate}</td>
      <td><button class="btn-edit" onclick='openEditModal(${JSON.stringify(inc)})'>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        แก้ไข
      </button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────────────────
//  EDIT MODAL
// ─────────────────────────────────────────────────────────
function openEditModal(inc) {
  // inc can be a full incident object passed from onclick
  currentEditId = inc.incident_id;
  document.getElementById('modalTitle').textContent = `แก้ไข ${inc.incident_id}`;
  document.getElementById('modalIncidentInfo').innerHTML = `<span class="incident-id">${inc.incident_id}</span> สถานะปัจจุบัน: <span class="status-badge ${getStatusClass(inc.status)}">${inc.status}</span>`;
  // Populate all fields
  document.getElementById('modalType').value        = inc.incident_type || 'FLOOD';
  document.getElementById('modalStatus').value      = inc.status || 'REPORTED';
  document.getElementById('modalSeverity').value    = inc.severity || '';
  document.getElementById('modalAffected').value    = inc.affected_count || 0;
  document.getElementById('modalDescription').value = inc.description || '';
  document.getElementById('modalAddress').value     = inc.address_name || '';
  // Location from GeoJSON coordinates [lng, lat]
  const coords = inc.location?.coordinates;
  document.getElementById('modalLat').value = coords ? coords[1] : '';
  document.getElementById('modalLng').value = coords ? coords[0] : '';
  // Show modal
  document.getElementById('editModal').style.display = 'flex';
  document.getElementById('modalSaveText').style.display   = 'inline';
  document.getElementById('modalSaveSpinner').style.display = 'none';
  document.getElementById('modalSaveBtn').disabled = false;
}

function getStatusClass(status) {
  const map = { REPORTED: 'badge-reported', VERIFIED: 'badge-verified', IN_PROGRESS: 'badge-inprogress', RESOLVED: 'badge-resolved', REJECTED: 'badge-rejected' };
  return map[status] || '';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEditId = null;
}

function closeEditModal(e) {
  if (e.target === document.getElementById('editModal')) closeModal();
}

async function saveIncidentEdit() {
  if (!currentEditId) return;
  const user = getSession();

  const newStatus      = document.getElementById('modalStatus').value;
  const newSeverity    = document.getElementById('modalSeverity').value;
  const newType        = document.getElementById('modalType').value;
  const newAffected    = document.getElementById('modalAffected').value;
  const newDescription = document.getElementById('modalDescription').value.trim();
  const newAddress     = document.getElementById('modalAddress').value.trim();
  const newLat         = document.getElementById('modalLat').value;
  const newLng         = document.getElementById('modalLng').value;

  document.getElementById('modalSaveBtn').disabled          = true;
  document.getElementById('modalSaveText').style.display    = 'none';
  document.getElementById('modalSaveSpinner').style.display = 'inline-flex';

  const body = {
    status:        newStatus,
    updated_by:    user?.reporter_id || 'ADMIN',
  };
  if (newSeverity)    body.severity      = newSeverity;
  if (newType)        body.incident_type = newType;
  if (newAffected)    body.affected_count = parseInt(newAffected);
  if (newDescription) body.description   = newDescription;
  if (newAddress)     body.address_name  = newAddress;
  if (newLat && newLng) { body.latitude = parseFloat(newLat); body.longitude = parseFloat(newLng); }

  const patchUrl = `https://dcvvgbft6j.execute-api.us-east-1.amazonaws.com/v1/incidents/${currentEditId}/status`;

  try {
    const res  = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      closeModal();
      await loadDashboard();
      showToast(`✅ อัปเดต ${currentEditId} สำเร็จ`);
    } else {
      showToast(`❌ ${data?.error?.message || 'เกิดข้อผิดพลาด'}`, true);
    }
  } catch (err) {
    showToast('❌ ไม่สามารถเชื่อมต่อ API ได้', true);
  } finally {
    document.getElementById('modalSaveBtn').disabled          = false;
    document.getElementById('modalSaveText').style.display    = 'inline';
    document.getElementById('modalSaveSpinner').style.display = 'none';
  }
}

// ─────────────────────────────────────────────────────────
//  TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  let toast = document.getElementById('toastMsg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${isError ? 'toast-error' : 'toast-success'} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}
