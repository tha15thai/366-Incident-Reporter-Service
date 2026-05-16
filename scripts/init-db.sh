#!/bin/bash
set -e

echo "🚀 Initializing Database Schema..."

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/terraform"

# ดึง endpoint จาก terraform output
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DB_HOST=$(echo "$RDS_ENDPOINT" | cut -d':' -f1)
DB_PORT=$(echo "$RDS_ENDPOINT" | cut -d':' -f2)
DB_NAME=$(terraform output -raw db_name 2>/dev/null || echo "incident_db")
DB_USER="incident_admin"

echo "📡 Connecting to: $DB_HOST:$DB_PORT/$DB_NAME"

# รับ password
echo -n "Enter DB password: "
read -s PGPASSWORD
echo ""
export PGPASSWORD

# รัน schema
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     -f "$PROJECT_ROOT/database/schema.sql"

echo "✅ Schema created!"
unset PGPASSWORD
