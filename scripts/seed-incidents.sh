#!/bin/bash
# seed-incidents.sh - สร้าง 5 Incidents ตัวอย่างผ่าน API

API_URL="https://dcvvgbft6j.execute-api.us-east-1.amazonaws.com/v1/incidents"
TMP_DIR=$(mktemp -d)

echo "🌊 Creating 5 test incidents..."

# เขียน JSON files แยก เพื่อหลีกเลี่ยง encoding issue บน Windows

cat > "$TMP_DIR/1.json" << 'ENDJSON'
{
  "reporter_id": "1234567890123",
  "reporter_name": "Somchai Jaidee",
  "incident_type": "FLOOD",
  "description": "\u0e19\u0e49\u0e33\u0e17\u0e48\u0e27\u0e21\u0e2a\u0e39\u0e07\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e40\u0e02\u0e48\u0e32 \u0e1a\u0e23\u0e34\u0e40\u0e27\u0e13\u0e16\u0e19\u0e19\u0e2a\u0e38\u0e02\u0e38\u0e21\u0e27\u0e34\u0e17 \u0e02\u0e27\u0e32\u0e07\u0e01\u0e32\u0e23\u0e08\u0e23\u0e32\u0e08\u0e23",
  "address_name": "\u0e16\u0e19\u0e19\u0e2a\u0e38\u0e02\u0e38\u0e21\u0e27\u0e34\u0e17 \u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23",
  "location": { "type": "Point", "coordinates": [100.5618, 13.7300] },
  "affected_count": 150,
  "incident_start": "2026-05-17T00:00:00.000Z",
  "report_channel": "mobile_app"
}
ENDJSON

cat > "$TMP_DIR/2.json" << 'ENDJSON'
{
  "reporter_id": "9876543210987",
  "reporter_name": "Somying Rakdee",
  "incident_type": "STORM",
  "description": "\u0e1e\u0e32\u0e22\u0e38\u0e1d\u0e19\u0e15\u0e01\u0e2b\u0e19\u0e31\u0e01\u0e21\u0e32\u0e01 \u0e25\u0e21\u0e41\u0e23\u0e07 \u0e15\u0e49\u0e19\u0e44\u0e21\u0e49\u0e25\u0e49\u0e21\u0e17\u0e31\u0e1a\u0e16\u0e19\u0e19",
  "address_name": "\u0e16\u0e19\u0e19\u0e19\u0e34\u0e21\u0e21\u0e32\u0e19\u0e40\u0e2b\u0e21\u0e34\u0e19\u0e17\u0e4c \u0e40\u0e0a\u0e35\u0e22\u0e07\u0e43\u0e2b\u0e21\u0e48",
  "location": { "type": "Point", "coordinates": [98.9853, 18.7953] },
  "affected_count": 80,
  "incident_start": "2026-05-17T00:05:00.000Z",
  "report_channel": "mobile_app"
}
ENDJSON

cat > "$TMP_DIR/3.json" << 'ENDJSON'
{
  "reporter_id": "1234567890123",
  "reporter_name": "Somchai Jaidee",
  "incident_type": "EARTHQUAKE",
  "description": "\u0e23\u0e39\u0e49\u0e2a\u0e36\u0e01\u0e41\u0e1c\u0e48\u0e19\u0e14\u0e34\u0e19\u0e44\u0e2b\u0e27\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e27\u0e25\u0e32\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 10 \u0e27\u0e34\u0e19\u0e32\u0e17\u0e35 \u0e2d\u0e32\u0e04\u0e32\u0e23\u0e2a\u0e31\u0e48\u0e19 \u0e2b\u0e19\u0e49\u0e32\u0e15\u0e48\u0e32\u0e07\u0e41\u0e15\u0e01",
  "address_name": "\u0e2d\u0e33\u0e40\u0e20\u0e2d\u0e40\u0e21\u0e37\u0e2d\u0e07 \u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14\u0e40\u0e0a\u0e35\u0e22\u0e07\u0e23\u0e32\u0e22",
  "location": { "type": "Point", "coordinates": [99.8324, 19.9071] },
  "affected_count": 300,
  "incident_start": "2026-05-17T00:10:00.000Z",
  "report_channel": "mobile_app"
}
ENDJSON

cat > "$TMP_DIR/4.json" << 'ENDJSON'
{
  "reporter_id": "9876543210987",
  "reporter_name": "Somying Rakdee",
  "incident_type": "FLOOD",
  "description": "\u0e19\u0e49\u0e33\u0e17\u0e48\u0e27\u0e21\u0e02\u0e31\u0e07 \u0e1a\u0e49\u0e32\u0e19\u0e40\u0e23\u0e37\u0e2d\u0e19\u0e40\u0e2a\u0e35\u0e22\u0e2b\u0e32\u0e22 \u0e0a\u0e32\u0e27\u0e1a\u0e49\u0e32\u0e19\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e04\u0e27\u0e32\u0e21\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d\u0e40\u0e23\u0e48\u0e07\u0e14\u0e48\u0e27\u0e19",
  "address_name": "\u0e15\u0e33\u0e1a\u0e25\u0e43\u0e19\u0e40\u0e21\u0e37\u0e2d\u0e07 \u0e19\u0e04\u0e23\u0e23\u0e32\u0e0a\u0e2a\u0e35\u0e21\u0e32",
  "location": { "type": "Point", "coordinates": [102.1011, 14.9799] },
  "affected_count": 500,
  "incident_start": "2026-05-17T00:15:00.000Z",
  "report_channel": "mobile_app"
}
ENDJSON

cat > "$TMP_DIR/5.json" << 'ENDJSON'
{
  "reporter_id": "1234567890123",
  "reporter_name": "Somchai Jaidee",
  "incident_type": "STORM",
  "description": "\u0e1e\u0e32\u0e22\u0e38\u0e42\u0e0b\u0e19\u0e23\u0e49\u0e2d\u0e19 \u0e04\u0e25\u0e37\u0e48\u0e19\u0e2a\u0e39\u0e07\u0e21\u0e32\u0e01 \u0e2b\u0e49\u0e32\u0e21\u0e25\u0e07\u0e17\u0e30\u0e40\u0e25 \u0e19\u0e31\u0e01\u0e17\u0e48\u0e2d\u0e07\u0e40\u0e17\u0e35\u0e48\u0e22\u0e27\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e04\u0e27\u0e32\u0e21\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d",
  "address_name": "\u0e2b\u0e32\u0e14\u0e1b\u0e48\u0e32\u0e15\u0e2d\u0e07 \u0e20\u0e39\u0e40\u0e01\u0e47\u0e15",
  "location": { "type": "Point", "coordinates": [98.2976, 7.8957] },
  "affected_count": 200,
  "incident_start": "2026-05-17T00:20:00.000Z",
  "report_channel": "mobile_app"
}
ENDJSON

# ส่งทีละอัน
for i in 1 2 3 4 5; do
  echo "$i/5 Creating incident..."
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data-binary "@$TMP_DIR/$i.json"
  echo ""
done

rm -rf "$TMP_DIR"
echo "✅ Done! Check: $API_URL"
