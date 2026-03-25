# 📦 คู่มือติดตั้ง SQLite และ GUI Viewer

## 🎯 เป้าหมาย
ติดตั้ง SQLite database และโปรแกรมดูตารางแบบ GUI เพื่อให้เห็นภาพข้อมูลชัดเจน

---

## ✅ ขั้นตอนที่ 1: ติดตั้ง Dependencies

เปิด Terminal ในโฟลเดอร์โปรเจกต์:

```bash
cd incident-reporter-service
npm install
```

**ระยะเวลา:** 1-2 นาที

**Note:** ครั้งนี้ใช้ `better-sqlite3` ซึ่งเป็น native module แต่ติดตั้งง่ายกว่า `sqlite3` เดิม

---

## ✅ ขั้นตอนที่ 2: รัน Server

```bash
npm start
```

**ผลลัพธ์ที่ควรเห็น:**
```
✅ Connected to SQLite database at: /path/to/data/incidents.db
🔧 Initializing database tables...

✅ Table: reporters
✅ Table: incidents
✅ Table: status_history
✅ Table: idempotency_keys

✅ Database initialization completed!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on http://localhost:3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Database:
   SQLite: ./data/incidents.db
```

**ตอนนี้จะมีไฟล์:** `data/incidents.db` ถูกสร้างขึ้นแล้ว! 🎉

---

## 📊 ขั้นตอนที่ 3: เลือกติดตั้ง GUI Viewer

เลือก **1 ตัวจาก 3 ตัว** ตามความชอบ:

---

### 🥇 **ตัวเลือกที่ 1: DB Browser for SQLite** (แนะนำสุด)

**ข้อดี:**
- ✅ ใช้งานง่ายที่สุด
- ✅ ฟรี 100%
- ✅ รองรับทุก OS (Windows, Mac, Linux)
- ✅ แก้ไขข้อมูลได้
- ✅ มี Query editor

#### วิธีติดตั้ง:

**Windows:**
1. ดาวน์โหลดจาก: https://sqlitebrowser.org/dl/
2. เลือก `DB.Browser.for.SQLite-xxx-win64.msi`
3. ติดตั้งตามปกติ
4. เปิดโปรแกรม `DB Browser for SQLite`

**Mac:**
1. ดาวน์โหลดจาก: https://sqlitebrowser.org/dl/
2. เลือก `DB.Browser.for.SQLite-xxx.dmg`
3. ลากไปที่ Applications
4. เปิดโปรแกรม

**Linux:**
```bash
sudo apt update
sudo apt install sqlitebrowser
```

#### วิธีใช้:
1. เปิด DB Browser for SQLite
2. คลิก `Open Database`
3. เลือกไฟล์ `incident-reporter-service/data/incidents.db`
4. คลิกแท็บ `Browse Data` → เลือกตารางที่ต้องการดู

**Screenshot หน้าตา:**
```
┌─────────────────────────────────────┐
│ File  Edit  View  Tools  Help      │
├─────────────────────────────────────┤
│ Database Structure | Browse Data   │
├─────────────────────────────────────┤
│ Table: [incidents ▼]               │
├──────┬──────────┬─────────┬────────┤
│ ID   │ Type     │ Status  │ Sever. │
├──────┼──────────┼─────────┼────────┤
│ INC1 │ FLOOD    │ REPORT  │ HIGH   │
│ INC2 │ FIRE     │ VERIFY  │ CRIT   │
└──────┴──────────┴─────────┴────────┘
```

---

### 🥈 **ตัวเลือกที่ 2: VS Code Extension** (สำหรับ Dev)

**ข้อดี:**
- ✅ ใช้ใน VS Code ได้เลย
- ✅ ไม่ต้องเปิดโปรแกรมอื่น
- ✅ Query ได้ในตัว

#### วิธีติดตั้ง:
1. เปิด VS Code
2. ไปที่ Extensions (Ctrl+Shift+X หรือ Cmd+Shift+X)
3. ค้นหา `SQLite Viewer` (by Florian Klampfer)
4. คลิก Install

#### วิธีใช้:
1. ใน VS Code Explorer, คลิกขวาที่ไฟล์ `data/incidents.db`
2. เลือก `Open Database`
3. เห็นตารางทั้งหมดในแท็บด้านข้าง
4. คลิกตารางเพื่อดูข้อมูล

---

### 🥉 **ตัวเลือกที่ 3: Online SQLite Viewer** (ไม่ต้องติดตั้ง)

**ข้อดี:**
- ✅ ไม่ต้องติดตั้งอะไรเลย
- ✅ เปิดใน browser ได้ทันที

**ข้อเสีย:**
- ⚠️ ต้อง upload ไฟล์ (ระวังข้อมูลสำคัญ)
- ⚠️ ต้องมี internet

#### วิธีใช้:
1. เปิด https://inloop.github.io/sqlite-viewer/
2. คลิก `Choose File` → เลือก `data/incidents.db`
3. เลือกตารางที่ต้องการดู

---

## 🎨 ขั้นตอนที่ 4: ทดสอบดูข้อมูล

### สร้างข้อมูลทดสอบ:

```bash
# Terminal อีกหน้าต่าง (server ยังรันอยู่)
npm test
```

หรือใช้ curl:
```bash
curl -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: test-001" \
  -d '{
    "reporter_id": "1103700123456",
    "reporter_name": "ธวัลหทัย เทียมทอง",
    "phone": "0812345678",
    "incident_type": "FLOOD",
    "location": {
      "type": "Point",
      "coordinates": [100.608, 14.072]
    },
    "description": "น้ำท่วมสูง 50 ซม."
  }'
```

### เปิด GUI Viewer ดูข้อมูล:

1. เปิด DB Browser (หรือ VS Code extension)
2. Load ไฟล์ `data/incidents.db`
3. เห็นข้อมูล 4 ตาราง:
   - **incidents** - เหตุการณ์ทั้งหมด
   - **reporters** - ผู้แจ้งเหตุ
   - **status_history** - ประวัติการเปลี่ยนสถานะ
   - **idempotency_keys** - key สำหรับป้องกันซ้ำ

---

## 🔍 วิธีใช้งาน GUI Viewer

### ดูตาราง Incidents:
1. เลือกตาราง `incidents`
2. เห็นคอลัมน์:
   - `incident_id` - รหัสเหตุการณ์
   - `incident_type` - ประเภท (FLOOD, FIRE, EARTHQUAKE)
   - `severity` - ความรุนแรง
   - `status` - สถานะปัจจุบัน
   - `location_lat`, `location_lng` - พิกัด
   - `description` - รายละเอียด
   - `created_at`, `updated_at` - เวลา

### ดูตาราง Status History:
1. เลือกตาราง `status_history`
2. เห็นประวัติการเปลี่ยนสถานะทั้งหมด
3. เรียงตาม `created_at` เพื่อดู timeline

### Query ข้อมูล (ใน DB Browser):
```sql
-- ดู incidents ที่มี severity = HIGH
SELECT * FROM incidents WHERE severity = 'HIGH';

-- ดู status history ของ incident เฉพาะ
SELECT * FROM status_history 
WHERE incident_id = 'INC123456' 
ORDER BY created_at;

-- นับจำนวน incident แต่ละประเภท
SELECT incident_type, COUNT(*) as count 
FROM incidents 
GROUP BY incident_type;
```

---

## 🎯 Tips สำหรับการ Demo

### ก่อน Demo:
1. ✅ เปิด server (`npm start`)
2. ✅ เปิด GUI viewer พร้อมไฟล์ database
3. ✅ วางหน้าจอให้เห็นทั้ง terminal และ GUI

### ขณะ Demo:
1. **สร้าง incident** → แสดงใน GUI ว่าข้อมูลเข้า table `incidents`
2. **อัปเดตสถานะ** → แสดงใน GUI ว่า:
   - ตาราง `incidents` สถานะเปลี่ยน
   - ตาราง `status_history` มี record ใหม่
3. **Refresh GUI** (F5) เพื่อแสดงข้อมูลล่าสุด

---

## 📱 ทางเลือกอื่นๆ

### TablePlus (สำหรับ Mac/Windows)
- เว็บไซต์: https://tableplus.com/
- Free version มี
- UI สวยมาก แต่ต้อง register

### DataGrip (สำหรับ Professional)
- เว็บไซต์: https://www.jetbrains.com/datagrip/
- Paid (แต่มี student license ฟรี)
- IDE เต็มรูปแบบ

---

## ❓ Troubleshooting

**Q: ไฟล์ incidents.db ไม่เห็น?**
- รัน `npm start` ก่อน database จะถูกสร้างอัตโนมัติ

**Q: GUI viewer ไม่เห็นข้อมูลใหม่?**
- กด Refresh (F5) หรือปิด-เปิดไฟล์ใหม่

**Q: ต้องการล้างข้อมูล?**
- ลบไฟล์ `data/incidents.db` แล้วรัน `npm start` ใหม่

**Q: better-sqlite3 ติดตั้งไม่ได้?**
- ตรวจสอบว่ามี build tools:
  - Windows: ติดตั้ง `npm install -g windows-build-tools`
  - Mac: ติดตั้ง Xcode Command Line Tools
  - Linux: `sudo apt install build-essential`

---

## 🎉 เสร็จแล้ว!

ตอนนี้คุณมี:
- ✅ SQLite Database ที่เก็บข้อมูลถาวร
- ✅ GUI Tool สำหรับดูตารางแบบ visual
- ✅ พร้อม demo ได้แบบเห็นภาพชัดเจน

**Happy Demo! 🚀**
