#!/bin/bash
set -e

echo "Starting deployment of Incident Reporter Service..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Helper: zip, falls back to PowerShell on Windows Git Bash without zip
# ---------------------------------------------------------------------------
do_zip() {
    local OUT="$1"
    local SRC="$2"
    rm -f "$OUT"
    if command -v zip > /dev/null 2>&1; then
        zip -r "$OUT" "$SRC" > /dev/null 2>&1
    else
        local ABS_OUT ABS_SRC
        ABS_OUT="$(pwd)/$OUT"
        ABS_SRC="$(pwd)/$SRC"
        WIN_OUT=$(cygpath -w "$ABS_OUT")
        WIN_SRC=$(cygpath -w "$ABS_SRC")
        powershell.exe -NoProfile -Command \
            "Compress-Archive -Path '$WIN_SRC' -DestinationPath '$WIN_OUT' -Force" \
            > /dev/null 2>&1
    fi
}

# ---------------------------------------------------------------------------
# Detect terraform binary (terraform on native Git Bash, terraform.exe on WSL)
# ---------------------------------------------------------------------------
if command -v terraform > /dev/null 2>&1; then
    TERRAFORM="terraform"
elif command -v terraform.exe > /dev/null 2>&1; then
    TERRAFORM="terraform.exe"
else
    echo -e "${RED}Terraform is not installed or not in PATH${NC}"
    exit 1
fi

if ! command -v node > /dev/null 2>&1; then
    echo -e "${RED}Node.js is not installed${NC}"
    exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.."; pwd)"
LAMBDA_DIR="$PROJECT_ROOT/lambda"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

# ---------------------------------------------------------------------------
# Step 1: Build Lambda dependencies
# ---------------------------------------------------------------------------
echo -e "${YELLOW}Step 1: Building Lambda dependencies...${NC}"
cd "$LAMBDA_DIR"
npm install --production

echo -e "${YELLOW}Creating Lambda layer...${NC}"
mkdir -p layers/nodejs/node_modules
mkdir -p layers/nodejs/shared
cp -r node_modules/* layers/nodejs/node_modules/
cp -r shared/* layers/nodejs/shared/
cd layers
do_zip dependencies.zip nodejs
cd ..
echo -e "${GREEN}Lambda layer created${NC}"

# ---------------------------------------------------------------------------
# Step 2: Package Lambda functions
# ---------------------------------------------------------------------------
echo -e "${YELLOW}Step 2: Packaging Lambda functions...${NC}"

cd "$LAMBDA_DIR/create-incident"
do_zip ../create-incident.zip index.js
echo -e "${GREEN}create-incident packaged${NC}"

cd "$LAMBDA_DIR/update-status"
do_zip ../update-status.zip index.js
echo -e "${GREEN}update-status packaged${NC}"

cd "$LAMBDA_DIR/get-incident"
do_zip ../get-incident.zip index.js
echo -e "${GREEN}get-incident packaged${NC}"

cd "$LAMBDA_DIR/list-incidents"
do_zip ../list-incidents.zip index.js
echo -e "${GREEN}list-incidents packaged${NC}"

cd "$LAMBDA_DIR/get-history"
do_zip ../get-history.zip index.js
echo -e "${GREEN}get-history packaged${NC}"

cd "$LAMBDA_DIR/resource-dispatched-handler"
do_zip ../resource-dispatched-handler.zip index.js
echo -e "${GREEN}resource-dispatched-handler packaged${NC}"

# ---------------------------------------------------------------------------
# Step 3: Deploy infrastructure with Terraform
# ---------------------------------------------------------------------------
echo -e "${YELLOW}Step 3: Deploying infrastructure...${NC}"
cd "$TERRAFORM_DIR"

echo -e "${YELLOW}Please enter a password for PostgreSQL:${NC}"
read -s DB_PASSWORD
echo

if [ ! -d ".terraform" ]; then
    $TERRAFORM init
fi

$TERRAFORM plan -var="db_password=$DB_PASSWORD" -out=tfplan
$TERRAFORM apply tfplan
$TERRAFORM output -json > outputs.json

API_URL=$($TERRAFORM output -raw api_gateway_url 2>/dev/null || echo "N/A")
RDS_ENDPOINT=$($TERRAFORM output -raw rds_endpoint 2>/dev/null || echo "N/A")

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}API Gateway URL:${NC}"
echo "   $API_URL"
echo ""
echo -e "${YELLOW}RDS Endpoint:${NC}"
echo "   $RDS_ENDPOINT"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "   1. Run: ./scripts/setup-db.sh"
echo "   2. Test: ./scripts/test-api.sh"
