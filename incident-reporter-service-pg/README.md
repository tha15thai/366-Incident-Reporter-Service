# 🚨 Incident Reporter Service
**Owner:** ธวัลหทัย เทียมทอง รหัส 6609650111  
**Role:** ฐานข้อมูลกลางของระบบ Disaster Management

---

## 📦 ติดตั้ง PostgreSQL

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows
ดาวน์โหลดจาก https://www.postgresql.org/download/windows/  
เลือก version 16 และติดตั้งตามขั้นตอน

---

## 🗄️ ตั้งค่า PostgreSQL

```bash
# เข้า PostgreSQL shell
sudo -u postgres psql          # Linux
psql -U postgres               # macOS/Windows

# สร้าง database
CREATE DATABASE incident_reporter;

# ออก psql
\q
```

---

## 🚀 รันโปรเจกต์

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. คัดลอก .env (ถ้ายังไม่มี)
cp .env.example .env  # แก้ DB_PASSWORD ให้ตรง

# 3. สร้างตาราง
npm run init-db

# 4. รัน server
npm start
# หรือ
npm run dev   # auto-reload
```

Server จะรันที่ http://localhost:3000

---

## 📚 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/incidents` | สร้าง incident ใหม่ |
| PUT    | `/incidents/:id/status` | อัปเดตสถานะ |
| GET    | `/incidents` | ดึงรายการทั้งหมด |
| GET    | `/incidents/:id` | ดึงตาม ID |
| GET    | `/incidents/:id/status-history` | Audit trail |
| GET    | `/reporters/:reporter_id` | ข้อมูลผู้แจ้งเหตุ |
| GET    | `/events/log` | Async event log |
| GET    | `/health` | Health check |

---

## 🔗 Status Flow

```
REPORTED → VERIFIED* → DISPATCHED → IN_PROGRESS → RESOLVED → CLOSED
REPORTED → REJECTED
```

> ⭐ **REPORTED → VERIFIED** จะเรียก **News Verification Service** ก่อนเสมอ  
> ถ้าข่าวปลอม → auto-REJECTED  
> ถ้าข่าวจริง → VERIFIED

---

## 🤝 Mock News Verification Service

ในไฟล์ `src/services/mockNewsVerificationService.js`  
จำลอง API ของเพื่อนที่ตรวจสอบข่าว:

```
POST /fact-check/verify
Body: { incident_id, incident_type, description, location, reported_at }
Response: { result: "VERIFIED"|"REJECTED", confidence, reason }
```

**ตั้งค่าใน .env:**
- `MOCK_NEWS_SERVICE=true` → ใช้ mock (default, ใช้ตอน demo)
- `MOCK_NEWS_SERVICE=false` + `NEWS_VERIFICATION_SERVICE_URL=http://...` → เรียก service จริง

---

## 🧪 Test ด้วย Postman

1. Import `Incident_Reporter_Demo.postman_collection.json`
2. ตั้ง `baseUrl` = `http://localhost:3000`
3. รัน request ตามลำดับ 0→16

---

## 🗃️ Database Schema

```sql
-- ตาราง REPORTERS
CREATE TABLE "Reporters" (
  reporter_id   TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  phone_num     TEXT NOT NULL,
  reporter_type reporter_type_enum NOT NULL DEFAULT 'citizen'
);

-- ตาราง INCIDENTS  
CREATE TABLE "Incidents" (
  incident_id    TEXT PRIMARY KEY,
  incident_type  incident_type_enum NOT NULL,  -- FLOOD|FIRE|EARTHQUAKE
  severity       severity_enum NOT NULL,        -- CRITICAL|HIGH|MEDIUM|LOW
  status         status_enum NOT NULL,          -- REPORTED|VERIFIED|...
  location       JSONB NOT NULL,               -- GeoJSON Point
  address_name   TEXT NOT NULL,
  incident_start TIMESTAMPTZ NOT NULL,
  ended_time     TIMESTAMPTZ,
  description    TEXT NOT NULL,
  reporter_id    TEXT REFERENCES "Reporters",
  report_channel TEXT,
  image_urls     TEXT[],
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ตาราง STATUS_HISTORY
CREATE TABLE "StatusHistory" (
  log_id      TEXT PRIMARY KEY,
  incident_id TEXT REFERENCES "Incidents",
  status      status_enum NOT NULL,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  TEXT NOT NULL
);
```
