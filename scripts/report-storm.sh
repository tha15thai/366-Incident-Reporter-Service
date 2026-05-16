#!/bin/bash
# scripts/report-storm.sh
# สคริปต์สำหรับส่งข้อมูลเหตุการณ์พายุขึ้น AWS โดยตรง (ไม่ต้องรัน deploy ใหม่)

set -e

# สีสำหรับแสดงผล
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

# 1. ค้นหา API URL จาก Terraform
if command -v terraform > /dev/null 2>&1; then
    TERRAFORM="terraform"
elif command -v terraform.exe > /dev/null 2>&1; then
    TERRAFORM="terraform.exe"
else
    echo -e "${RED}❌ ไม่พบคำสั่ง terraform ในเครื่อง${NC}"
    exit 1
fi

API_URL=$($TERRAFORM output -raw api_gateway_url 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
    echo -e "${RED}❌ ไม่พบ API URL กรุณาตรวจสอบว่ารัน terraform apply สำเร็จแล้วหรือไม่${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 กำลังเตรียมส่งข้อมูลพายุ (STORM) ไปยัง: ${NC}$API_URL"

# 2. สร้าง Payload สำหรับแจ้งเหตุ
# หมายเหตุ: Severity ถูกตั้งเป็น HIGH เสมอตามที่ระบุไว้
cat << 'EOF' > temp_storm.json
{
  "reporter_id": "9876543210987",
  "reporter_name": "เจ้าหน้าที่ศูนย์เฝ้าระวัง",
  "incident_type": "STORM",
  "severity": "HIGH",
  "location": {"type": "Point", "coordinates": [100.5505, 13.8048]},
  "address_name": "สวนจตุจักร, กรุงเทพมหานคร",
  "description": "พายุฤดูร้อนพัดถล่มรุนแรง มีต้นไม้ขนาดใหญ่ล้มขวางถนน และป้ายโฆษณาพังเสียหายหลายจุด กำลังประสานงานกู้ภัย",
  "affected_count": 0
}
EOF

# 3. ส่งข้อมูลผ่าน cURL
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d @temp_storm.json)

# ลบไฟล์ชั่วคราว
rm temp_storm.json

# 4. ตรวจสอบและแสดงผล
echo -e "\n${GREEN}✅ ส่งข้อมูลเรียบร้อยแล้ว!${NC}"
echo "------------------------------------------------"
echo "Response จากระบบ:"
echo "$RESPONSE"
echo "------------------------------------------------"

# ดึง Incident ID จาก Response (ถ้ามี)
INC_ID=$(echo "$RESPONSE" | grep -o '"incident_id":"[^"]*"' | cut -d'"' -f4 || echo "")
if [ ! -z "$INC_ID" ]; then
    echo -e "${GREEN}สร้าง Incident สำเร็จ ID: $INC_ID${NC}"
else
    echo -e "${RED}⚠️ ไม่ได้รับ Incident ID กลับมา กรุณาตรวจสอบความถูกต้องของระบบ${NC}"
fi
