#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

if command -v terraform > /dev/null 2>&1; then
    TERRAFORM="terraform"
elif command -v terraform.exe > /dev/null 2>&1; then
    TERRAFORM="terraform.exe"
else
    echo -e "${RED}Terraform is not installed or not in PATH${NC}"
    exit 1
fi

RDS_ENDPOINT=$($TERRAFORM output -raw rds_endpoint)
DB_NAME=$($TERRAFORM output -raw db_name 2>/dev/null || echo "incident_db")
DB_USER="incident_admin"

DB_HOST=$(echo $RDS_ENDPOINT | cut -d':' -f1)
DB_PORT=$(echo $RDS_ENDPOINT | cut -d':' -f2)

export PGPASSWORD=$($TERRAFORM output -raw db_password)

if [ -z "$PGPASSWORD" ]; then
    echo -e "${YELLOW}Please enter database password:${NC}"
    read -s PGPASSWORD
    echo ""
    export PGPASSWORD
fi

export PGCLIENTENCODING=utf8

echo -e "${BLUE}Updating all incidents to HIGH severity...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "UPDATE \"Incidents\" SET severity='HIGH';"

echo -e "${GREEN}✅ Successfully updated all incidents!${NC}"
unset PGPASSWORD
