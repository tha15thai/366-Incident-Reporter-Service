#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="https://8wbns0ueuj.execute-api.us-east-1.amazonaws.com/v1/incidents"

echo -e "${BLUE}🌱 Seeding diverse Incident Data...${NC}"

# 1. Fire - Critical
echo -e "${YELLOW}Adding: FIRE (CRITICAL)...${NC}"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_id": "1234567890123",
    "reporter_name": "Somchai Jaidee",
    "phone": "0812345678",
    "incident_type": "FIRE",
    "location": {"type": "Point", "coordinates": [100.5231, 13.7367]},
    "address_name": "Siam Square, Bangkok",
    "description": "Large fire breakout in the basement parking area.",
    "severity": "CRITICAL",
    "affected_count": 150
  }' | python3 -m json.tool || echo "Failed to add Fire"

# 2. Flood - High
echo -e "\n${YELLOW}Adding: FLOOD (HIGH)...${NC}"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_id": "9876543210987",
    "reporter_name": "Somying Rakdee",
    "phone": "0898765432",
    "incident_type": "FLOOD",
    "location": {"type": "Point", "coordinates": [100.608, 14.072]},
    "address_name": "Navanakorn, Pathum Thani",
    "description": "Flash flood after heavy rain. Water level rising fast.",
    "severity": "HIGH",
    "affected_count": 30
  }' | python3 -m json.tool || echo "Failed to add Flood"

# 3. Earthquake - Critical
echo -e "\n${YELLOW}Adding: EARTHQUAKE (CRITICAL)...${NC}"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_id": "1234567890123",
    "reporter_name": "Somchai Jaidee",
    "phone": "0812345678",
    "incident_type": "EARTHQUAKE",
    "location": {"type": "Point", "coordinates": [99.840, 19.910]},
    "address_name": "Chiang Rai Center",
    "description": "Strong tremors felt across the city. Building cracks reported.",
    "severity": "CRITICAL",
    "affected_count": 500
  }' | python3 -m json.tool || echo "Failed to add Earthquake"

# 4. Power Outage - Medium
echo -e "\n${YELLOW}Adding: POWER_OUTAGE (MEDIUM)...${NC}"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_id": "9876543210987",
    "reporter_name": "Somying Rakdee",
    "phone": "0898765432",
    "incident_type": "POWER_OUTAGE",
    "location": {"type": "Point", "coordinates": [100.540, 13.700]},
    "address_name": "Rama 3, Bangkok",
    "description": "Blackout in the neighborhood for over 2 hours.",
    "severity": "MEDIUM",
    "affected_count": 200
  }' | python3 -m json.tool || echo "Failed to add Power Outage"

echo -e "\n${GREEN}✅ Seeding completed!${NC}"
