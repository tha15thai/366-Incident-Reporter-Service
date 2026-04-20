#!/bin/bash
set -e

echo "🗄️  Seeding database with diverse examples..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

if [ ! -f "outputs.json" ]; then
    echo -e "${RED}❌ Run deploy.sh first or generate outputs.json${NC}"
    exit 1
fi

RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DB_NAME=$(terraform output -raw db_name 2>/dev/null || echo "incident_db")
DB_USER="incident_admin"

DB_HOST=$(echo $RDS_ENDPOINT | cut -d':' -f1)
DB_PORT=$(echo $RDS_ENDPOINT | cut -d':' -f2)

echo -e "${YELLOW}Please enter database password:${NC}"
read -s DB_PASSWORD
echo ""

export PGPASSWORD="$DB_PASSWORD"

echo -e "${YELLOW}Running diverse seed SQL...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$PROJECT_ROOT/database/seed_incidents.sql"

echo -e "${GREEN}🎉 Seeding complete!${NC}"
unset PGPASSWORD
