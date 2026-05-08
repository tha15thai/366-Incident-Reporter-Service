$body = @{
  reporter_id = "1234567890123"
  reporter_name = "สมชาย ใจดี"
  phone = "0812345678"
  incident_type = "STORM"
  location = @{
      type = "Point"
      coordinates = @(100.608, 14.072)
  }
  address_name = "ร้านสะดวกซื้อ ปากซอยสุขุมวิท 50 กรุงเทพ"
  description = "ลมพายุแรงมาก พัดป้ายโฆษณาถล่มทับคน"
  severity = "HIGH"
  affected_count = 5
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "https://8wbns0ueuj.execute-api.us-east-1.amazonaws.com/v1/incidents" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json
