#!/bin/bash
set -e

echo "🚀 Starting deployment of Incident Reporter Service..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAMBDA_DIR="$PROJECT_ROOT/lambda"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

echo -e "${YELLOW}📦 Step 1: Building Lambda dependencies...${NC}"
cd "$LAMBDA_DIR"
npm install --production

echo -e "${YELLOW}📦 Creating Lambda layer...${NC}"
mkdir -p layers/nodejs/node_modules
mkdir -p layers/nodejs/shared
cp -r node_modules/* layers/nodejs/node_modules/
cp -r shared/* layers/nodejs/shared/
cd layers
zip -r dependencies.zip nodejs > /dev/null 2>&1
cd ..
echo -e "${GREEN}✅ Lambda layer created${NC}"

echo -e "${YELLOW}📦 Step 2: Packaging Lambda functions...${NC}"

cd "$LAMBDA_DIR/create-incident"
zip -r ../create-incident.zip index.js > /dev/null 2>&1
echo -e "${GREEN}✅ create-incident packaged${NC}"

cd "$LAMBDA_DIR/update-status"
zip -r ../update-status.zip index.js > /dev/null 2>&1
echo -e "${GREEN}✅ update-status packaged${NC}"

cd "$LAMBDA_DIR/get-incident"
zip -r ../get-incident.zip index.js > /dev/null 2>&1
echo -e "${GREEN}✅ get-incident packaged${NC}"

cd "$LAMBDA_DIR/list-incidents"
zip -r ../list-incidents.zip index.js > /dev/null 2>&1
echo -e "${GREEN}✅ list-incidents packaged${NC}"

cd "$LAMBDA_DIR/get-history"
zip -r ../get-history.zip index.js > /dev/null 2>&1
echo -e "${GREEN}✅ get-history packaged${NC}"

cd "$LAMBDA_DIR/resource-dispatched-handler"
zip -r ../resource-dispatched-handler.zip index.js > /dev/null 2>&1
echo -e "${GREEN}✅ resource-dispatched-handler packaged${NC}"

echo -e "${YELLOW}🏗️  Step 3: Deploying infrastructure...${NC}"
cd "$TERRAFORM_DIR"

echo -e "${YELLOW}Please enter a password for PostgreSQL:${NC}"
read -s DB_PASSWORD
echo

if [ ! -d ".terraform" ]; then
    terraform init
fi

terraform plan -var="db_password=$DB_PASSWORD" -out=tfplan
terraform apply tfplan

terraform output -json > outputs.json

API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "N/A")
RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "N/A")

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}🔗 API Gateway URL:${NC}"
echo "   $API_URL"
echo ""
echo -e "${YELLOW}🗄️  RDS Endpoint:${NC}"
echo "   $RDS_ENDPOINT"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Run: ./scripts/setup-db.sh"
echo "   2. Test: ./scripts/test-api.sh"
