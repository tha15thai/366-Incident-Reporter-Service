#!/bin/bash
set -e

echo "🇹🇭  Translating Incidents data to Thai..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

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

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$PROJECT_ROOT/database/translate.sql"

echo -e "${GREEN}✅ Data translated successfully!${NC}"
unset PGPASSWORD
