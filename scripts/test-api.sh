#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
    echo -e "${RED}❌ API URL not found. Please run deploy first.${NC}"
    exit 1
fi

echo -e "${BLUE}Testing Incident Reporter API${NC}"
echo -e "${YELLOW}API Endpoint: $API_URL${NC}"
echo ""

# Helper function to check for errors in response
check_response() {
    if [[ "$1" == *"Missing Authentication Token"* ]]; then
        echo -e "${RED}❌ URL Error: API Gateway cannot find this resource. (404)${NC}"
        exit 1
    elif [[ "$1" == *"INTERNAL_ERROR"* ]]; then
        echo -e "${RED}❌ Server Error: Lambda failed to process request. Check CloudWatch logs.${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}Test 1: Create Incident${NC}"

# สร้างไฟล์ json แบบชั่วคราวเพื่อป้องกันปัญหาตัวหนังสือภาษาไทยกลายเป็น ???? บน Windows
cat << 'EOF' > temp_payload.json
{
  "reporter_id": "1234567890123",
  "reporter_name": "สมชาย ใจดี",
  "phone": "0812345678",
  "incident_type": "FIRE",
  "location": {"type": "Point", "coordinates": [100.608, 14.072]},
  "address_name": "ร้านสะดวกซื้อ ปากซอยสุขุมวิท 50 กรุงเทพ",
  "description": "ไฟไหม้แผงสายไฟฟ้าหน้าร้าน ลูกไฟตกลงมาใส่หลังคารถยนต์ประชาชน",
  "severity": "HIGH",
  "affected_count": 5
}
EOF

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d @temp_payload.json)

rm temp_payload.json

echo "$RESPONSE"
check_response "$RESPONSE"

INCIDENT_ID=$(echo "$RESPONSE" | grep -o '"incident_id":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$INCIDENT_ID" ]; then
    echo -e "${RED}❌ Failed to get Incident ID from response${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Created: $INCIDENT_ID${NC}\n"

sleep 1

echo -e "${YELLOW}Test 2: Get Incident${NC}"
GET_RESPONSE=$(curl -s "$API_URL/$INCIDENT_ID")
echo "$GET_RESPONSE"
check_response "$GET_RESPONSE"
echo -e "\n${GREEN}✅ Get successful${NC}\n"

echo -e "${YELLOW}Test 3: List Incidents${NC}"
LIST_RESPONSE=$(curl -s "$API_URL?limit=5")
echo "$LIST_RESPONSE"
check_response "$LIST_RESPONSE"
echo -e "\n${GREEN}✅ List successful${NC}\n"

echo -e "${GREEN}⭐ All tests passed successfully!${NC}"
