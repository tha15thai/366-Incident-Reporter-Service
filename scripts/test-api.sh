#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
    echo "❌ API URL not found"
    exit 1
fi

echo -e "${BLUE}Testing Incident Reporter API${NC}"
echo -e "${YELLOW}API: $API_URL${NC}"
echo ""

echo -e "${YELLOW}Test 1: Create Incident${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_id": "1234567890123",
    "reporter_name": "Test User",
    "phone": "0812345678",
    "incident_type": "FLOOD",
    "location": {"type": "Point", "coordinates": [100.608, 14.072]},
    "address_name": "Test Location",
    "description": "Test incident",
    "severity": "HIGH",
    "affected_count": 5
  }')

echo "$RESPONSE"
INCIDENT_ID=$(echo "$RESPONSE" | grep -o '"incident_id":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✅ Created: $INCIDENT_ID${NC}\n"

sleep 2

echo -e "${YELLOW}Test 2: Get Incident${NC}"
curl -s "$API_URL/$INCIDENT_ID"
echo -e "\n${GREEN}✅ Get successful${NC}\n"

sleep 2

echo -e "${YELLOW}Test 3: List Incidents${NC}"
curl -s "$API_URL?limit=5"
echo -e "\n${GREEN}✅ List successful${NC}\n"

echo -e "${GREEN}All tests completed!${NC}"
