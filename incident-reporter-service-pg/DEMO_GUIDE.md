# 🎬 คู่มือการ Demo ในคาบเรียน

## 📋 เตรียมตัวก่อน Demo (5 นาที)

### 1. เปิด Terminal และรัน Server
```bash
cd incident-reporter-service
npm start
```

ต้องเห็นข้อความนี้:
```
✅ Server running on http://localhost:3000
💡 Ready for demo!
```

### 2. เปิด Terminal อีกหน้าต่างสำหรับ Test
หรือใช้ Postman/Thunder Client

---

## 🎯 Scenario 1: Synchronous API Demo (5-7 นาที)

### Demo 1.1: สร้าง Incident (POST)

**อธิบาย:**
> "ผู้ประสบภัยแจ้งเหตุน้ำท่วมผ่าน mobile app บริการของเรารับข้อมูลและบันทึกลงฐานข้อมูล"

**คำสั่ง:**
```bash
curl -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: 12345678-1234-1234-1234-123456789012" \
  -d '{
    "reporter_id": "1103700123456",
    "reporter_name": "ธวัลหทัย เทียมทอง",
    "phone": "0812345678",
    "incident_type": "FLOOD",
    "location": {
      "type": "Point",
      "coordinates": [100.608, 14.072]
    },
    "description": "น้ำท่วมสูงประมาณ 50 ซม.",
    "severity": "HIGH"
  }'
```

**จุดเด่นที่ต้องอธิบาย:**
- ✅ ได้ `incident_id` กลับมา (เช่น INC123456)
- ✅ Status เริ่มต้นคือ `REPORTED`
- ✅ ระบบคำนวณ severity อัตโนมัติ (ถ้าไม่ส่งมา)
- ✅ **บันทึก X-Request-Id** → เก็บ incident_id ไว้ใช้ในขั้นต่อไป

---

### Demo 1.2: Idempotency Test (ส่ง Request เดิมซ้ำ)

**อธิบาย:**
> "ถ้า network ล่มและ retry request เดิม ระบบจะไม่สร้าง incident ซ้ำ"

**คำสั่ง:** (ใช้ X-Request-Id เดิม)
```bash
curl -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: 12345678-1234-1234-1234-123456789012" \
  -d '{
    "reporter_id": "1103700123456",
    "reporter_name": "ธวัลหทัย เทียมทอง",
    "phone": "0812345678",
    "incident_type": "FLOOD",
    "location": {
      "type": "Point",
      "coordinates": [100.608, 14.072]
    },
    "description": "น้ำท่วมสูงประมาณ 50 ซม.",
    "severity": "HIGH"
  }'
```

**จุดเด่น:**
- ✅ ได้ `incident_id` เดิมกลับมา
- ✅ ไม่มีการสร้าง incident ใหม่

---

### Demo 1.3: Update Status (PUT)

**อธิบาย:**
> "เจ้าหน้าที่ตรวจสอบข้อมูลเบื้องต้นแล้ว เปลี่ยนสถานะเป็น VERIFIED"

**คำสั่ง:** (แทนที่ INC123456 ด้วย incident_id จริง)
```bash
curl -X PUT http://localhost:3000/api/v1/incidents/INC123456/status \
  -H "Content-Type: application/json" \
  -H "X-Admin-Id: ADMIN001" \
  -d '{
    "status": "VERIFIED",
    "description": "ตรวจสอบจากภาพถ่ายแล้ว"
  }'
```

**จุดเด่น:**
- ✅ เห็น `old_status: REPORTED` → `new_status: VERIFIED`
- ✅ บันทึก status history

---

### Demo 1.4: State Transition Validation

**อธิบาย:**
> "ทดสอบ state machine - ถ้าเปลี่ยนสถานะผิดลำดับจะ error"

**คำสั่ง:** (ลอง VERIFIED → CLOSED ซึ่งผิด)
```bash
curl -X PUT http://localhost:3000/api/v1/incidents/INC123456/status \
  -H "Content-Type: application/json" \
  -H "X-Admin-Id: ADMIN001" \
  -d '{
    "status": "CLOSED"
  }'
```

**ผลลัพธ์ที่ควรได้:**
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot change status from VERIFIED to CLOSED"
  }
}
```

**จุดเด่น:**
- ✅ ระบบป้องกันการเปลี่ยนสถานะผิดลำดับ
- ✅ Error message ชัดเจน

---

## 🌐 Scenario 2: Asynchronous Event Demo (3-5 นาที)

### Demo 2.1: แสดง Console Log

**อธิบาย:**
> "ทุกครั้งที่มีการสร้างหรืออัปเดต incident ระบบจะ publish event ไปยัง message queue"

**ขั้นตอน:**
1. **เปิด Terminal ที่รัน Server ให้เห็น**
2. **สร้าง incident ใหม่** (ดูที่ Demo 1.1)
3. **ให้ดูใน Console:**

```
📤 Event Published: IncidentReported (550e8400-e29b-41d4-a716-446655440000)
📥 [Consumer] Evacuation Service received: INC123456
```

4. **อัปเดตสถานะ** (ดูที่ Demo 1.3)
5. **ให้ดูใน Console:**

```
📤 Event Published: IncidentStatusChanged (550e8400-e29b-41d4-a716-446655440001)
   REPORTED → VERIFIED
📥 [Consumer] Resource Allocation received: INC123456 status changed to VERIFIED
```

**จุดเด่น:**
- ✅ แสดง Publish/Subscribe pattern
- ✅ Mock consumers รับ event อัตโนมัติ

---

### Demo 2.2: ดู Event Log

**อธิบาย:**
> "ระบบเก็บ log ของ event ทั้งหมดที่ publish ไปแล้ว"

**คำสั่ง:**
```bash
curl http://localhost:3000/api/v1/events/log
```

**ผลลัพธ์:**
```json
{
  "total": 5,
  "events": [
    {
      "messageId": "550e8400-...",
      "eventType": "IncidentReported",
      "timestamp": "2026-03-11T...",
      "payload": {...}
    },
    {
      "messageId": "550e8400-...",
      "eventType": "IncidentStatusChanged",
      "payload": {
        "previousStatus": "REPORTED",
        "currentStatus": "VERIFIED"
      }
    }
  ]
}
```

**จุดเด่น:**
- ✅ เห็น event history ทั้งหมด
- ✅ มี messageId สำหรับ tracking

---

## 💡 Bonus Demos (ถ้ามีเวลา)

### Bonus 1: Duplicate Detection

**อธิบาย:**
> "ถ้ามีคนแจ้งเหตุซ้ำในพื้นที่เดียวกันภายใน 10 นาที ระบบจะตรวจจับได้"

**คำสั่ง:** (ใช้ location เดิม แต่ X-Request-Id ใหม่)
```bash
curl -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: NEW-UUID-HERE" \
  -d '{
    "reporter_id": "9999999999999",
    "reporter_name": "คนใหม่",
    "phone": "0899999999",
    "incident_type": "FLOOD",
    "location": {
      "type": "Point",
      "coordinates": [100.608, 14.072]
    },
    "description": "แจ้งซ้ำ"
  }'
```

**ผลลัพธ์:**
```json
{
  "error": {
    "code": "DUPLICATE_INCIDENT",
    "message": "Similar incident already reported in this area within 10 minutes"
  }
}
```

---

### Bonus 2: Filter Incidents

**คำสั่ง:**
```bash
# ดู incident ทั้งหมด
curl http://localhost:3000/api/v1/incidents

# Filter by status
curl http://localhost:3000/api/v1/incidents?status=VERIFIED

# Filter by severity
curl http://localhost:3000/api/v1/incidents?severity=HIGH
```

---

## 📝 Script สำหรับพูดในขณะ Demo

### เปิดตัว (30 วินาที)
> "สวัสดีครับ วันนี้ผมจะ demo **Incident Reporter Service** ซึ่งเป็นศูนย์กลางในการรับแจ้งเหตุภัยพิบัติ
> 
> บริการนี้มี 2 ฟังก์ชันหลัก:
> 1. **Synchronous API** - รับแจ้งเหตุและอัปเดตสถานะ
> 2. **Asynchronous Events** - แจ้ง service อื่นๆ ผ่าน message queue
>
> ผมจะ demo ทั้ง 2 แบบให้ดูครับ"

### ขณะ Demo Sync API
> "ตอนนี้ผู้ประสบภัยแจ้งเหตุน้ำท่วมเข้ามา... [ส่ง request]
> 
> ระบบสร้าง incident_id ให้อัตโนมัติ และเริ่มต้นด้วยสถานะ REPORTED
> 
> สังเกตว่าผมใช้ header `X-Request-Id` เพื่อป้องกันการสร้างซ้ำ... [demo idempotency]
> 
> ต่อมาเจ้าหน้าที่ตรวจสอบข้อมูลและเปลี่ยนสถานะเป็น VERIFIED... [update status]
> 
> ถ้าเปลี่ยนผิดลำดับ จะ error... [demo invalid transition]"

### ขณะ Demo Async Events
> "ทุกครั้งที่มีการเปลี่ยนแปลง ระบบจะ publish event ออกไป
> 
> ดูที่ console... [ชี้ที่ terminal] เห็นไหมครับว่ามี event IncidentStatusChanged ถูก publish
> 
> และ mock consumer ก็รับไปประมวลผลแล้ว
> 
> เรายังดู event log ทั้งหมดได้จาก API... [เรียก GET /events/log]
> 
> เห็นประวัติทุก event ที่เกิดขึ้น พร้อม messageId สำหรับ tracking"

### ปิดท้าย (20 วินาที)
> "สรุปครับ บริการนี้รองรับ:
> - ✅ Idempotency
> - ✅ State machine validation
> - ✅ Duplicate detection
> - ✅ Event-driven architecture
>
> ขอบคุณครับ มีคำถามไหมครับ?"

---

## 🔧 เตรียมตัวสำรอง (กรณีมีปัญหา)

### ถ้า Server ไม่ขึ้น
1. ตรวจสอบ port 3000 ว่าว่างหรือไม่
2. ลอง `npm install` ใหม่
3. เปิด `npm start` อีกครั้ง

### ถ้า curl ไม่มี
ใช้ Postman โดย import file:
```
Incident_Reporter_Demo.postman_collection.json
```

### ถ้า Demo ล่ม
ใช้ auto demo script:
```bash
npm test
```

---

## ⏱️ เวลาโดยประมาณ

| หัวข้อ | เวลา |
|--------|------|
| เปิดตัว + อธิบาย | 1 นาที |
| Demo Sync API | 5 นาที |
| Demo Async Events | 3 นาที |
| Q&A | 1-2 นาที |
| **รวม** | **10-12 นาที** |

---

🎉 **พร้อม Demo แล้ว!** Good luck! 💪
