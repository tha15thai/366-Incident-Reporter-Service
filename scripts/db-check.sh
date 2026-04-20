#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DB_NAME=$(terraform output -raw db_name 2>/dev/null || echo "incident_db")
DB_USER="incident_admin"

DB_HOST=$(echo $RDS_ENDPOINT | cut -d':' -f1)
DB_PORT=$(echo $RDS_ENDPOINT | cut -d':' -f2)

echo -e "${YELLOW}Please enter database password:${NC}"
read -s DB_PASSWORD
echo ""

export PGPASSWORD="$DB_PASSWORD"

echo -e "${BLUE}--- [Table: Reporter] All Columns ---${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\x on" -c "SELECT * FROM \"Reporter\";"

echo -e "\n${BLUE}--- [Table: Incidents] All Columns ---${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\x on" -c "SELECT * FROM \"Incidents\" ORDER BY created_at DESC;"

echo -e "\n${BLUE}--- [Table: StatusHistory] All Columns ---${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\x on" -c "SELECT * FROM \"StatusHistory\" ORDER BY created_at DESC;"

unset PGPASSWORD
