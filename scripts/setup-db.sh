#!/bin/bash
set -e

echo "🗄️  Setting up database schema..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql not installed${NC}"
    exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

cd "$TERRAFORM_DIR"

if [ ! -f "outputs.json" ]; then
    echo -e "${RED}❌ Run deploy.sh first${NC}"
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

echo -e "${YELLOW}Testing connection...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    exit 1
fi

echo -e "${YELLOW}Running schema...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$PROJECT_ROOT/database/schema.sql"

echo -e "${GREEN}🎉 Database setup complete!${NC}"
unset PGPASSWORD
