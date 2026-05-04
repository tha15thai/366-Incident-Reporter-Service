#!/bin/bash
set -e

echo "🛠️  Fixing Incident ID and removing badly encoded data..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

echo -e "${YELLOW}1. Packaging the Lambda properly...${NC}"
cd "$PROJECT_ROOT/lambda/create-incident"
rm -f ../create-incident.zip
# Use powershell on windows or zip on minw
if command -v zip > /dev/null 2>&1; then
    zip -r ../create-incident.zip index.js > /dev/null 2>&1
else
    powershell.exe -NoProfile -Command "Compress-Archive -Path '$(cygpath -w $(pwd)/index.js)' -DestinationPath '$(cygpath -w $(pwd)/../create-incident.zip)' -Force" > /dev/null 2>&1
fi

echo -e "${YELLOW}2. Redeploying the Lambda code to AWS...${NC}"
cd "$PROJECT_ROOT/terraform"
terraform apply -target="aws_lambda_function.create_incident" -auto-approve

echo -e "${YELLOW}3. Connecting to DB to clean up ALL bad incidents...${NC}"
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DB_NAME=$(terraform output -raw db_name 2>/dev/null || echo "incident_db")
DB_USER="incident_admin"

DB_HOST=$(echo $RDS_ENDPOINT | cut -d':' -f1)
DB_PORT=$(echo $RDS_ENDPOINT | cut -d':' -f2)

export PGPASSWORD=$(terraform output -raw db_password)

if [ -z "$PGPASSWORD" ]; then
    echo -e "${YELLOW}Please enter database password:${NC}"
    read -s PGPASSWORD
    echo ""
    export PGPASSWORD
fi

# ลบขยะทั้งหมดที่ขึ้นต้นด้วย INCM (ที่เป็นตัวเลขสุ่มๆ ทั้งหมดทิ้ง)
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM \"Incidents\" WHERE incident_id LIKE 'INCM%';"

echo -e "${GREEN}✅ Bad incidents completely cleared and Lambda successfully updated!${NC}"
unset PGPASSWORD
