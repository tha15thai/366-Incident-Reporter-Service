#!/bin/bash
set -e

echo "🗑️  Destroying infrastructure..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

cd "$TERRAFORM_DIR"

echo -e "${RED}⚠️  WARNING: This will destroy all infrastructure!${NC}"
echo -e "${YELLOW}Type 'yes' to confirm:${NC}"
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled"
    exit 0
fi

echo -e "${YELLOW}Enter database password:${NC}"
read -s DB_PASSWORD
echo ""

terraform destroy -var="db_password=$DB_PASSWORD" -auto-approve

cd "$PROJECT_ROOT"
rm -rf lambda/*.zip lambda/layers/dependencies.zip lambda/layers/nodejs

echo -e "${GREEN}🎉 All resources destroyed!${NC}"
