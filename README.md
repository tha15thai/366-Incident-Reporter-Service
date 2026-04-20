# Incident Reporter Service

Disaster Management System - Central Incident Reporting Service

## 🎯 Overview

Incident Reporter Service เป็นบริการหลักในระบบจัดการภัยพิบัติ ทำหน้าที่เป็นฐานข้อมูลกลาง (Master Data) สำหรับการรับแจ้งเหตุ ติดตามสถานะ และประสานงานกับบริการอื่นๆ ในระบบ

### Key Features

- ✅ รับแจ้งเหตุจากหลายช่องทาง (Mobile App, Emergency Call, Social Media, News)
- ✅ ตรวจจับเหตุการณ์ซ้ำซ้อนอัตโนมัติ (Duplicate Detection)
- ✅ กำหนดระดับความรุนแรง (Severity) อัตโนมัติ
- ✅ จัดการ State Machine ของสถานะเหตุการณ์
- ✅ Event-Driven Architecture (SNS/SQS)
- ✅ Spatial Queries รองรับการค้นหาตามพิกัด
- ✅ Audit Trail สมบูรณ์

---

## 🏗️ Architecture

```
API Gateway → Lambda Functions → RDS PostgreSQL
                ↓
              SNS Topics → Subscribers
                ↑
           SQS Queues ← External Services
```

### Technologies

- **Compute**: AWS Lambda (Node.js 20.x)
- **API**: Amazon API Gateway (REST)
- **Database**: Amazon RDS PostgreSQL 15.4 + PostGIS
- **Messaging**: Amazon SNS + SQS
- **IaC**: Terraform

---

## 🚀 Quick Start

### Prerequisites

- AWS Account (AWS Learner Lab)
- AWS CLI configured
- Terraform >= 1.0
- Node.js >= 18.x
- PostgreSQL client (psql)

### Installation

1. **Clone repository**
```bash
git clone <your-repo>
cd incident-reporter-service
```

2. **Deploy infrastructure**
```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

Enter database password when prompted.

3. **Setup database**
```bash
./scripts/setup-db.sh
```

4. **Test API**
```bash
./scripts/test-api.sh
```

---

## 📡 API Endpoints

**Base URL**: `https://<api-id>.execute-api.us-east-1.amazonaws.com/v1`

### Synchronous APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/incidents` | Create incident report |
| GET | `/incidents` | List incidents (with filters) |
| GET | `/incidents/{id}` | Get incident detail |
| PATCH | `/incidents/{id}/status` | Update incident status |
| GET | `/incidents/{id}/history` | Get status history |

### Events (Asynchronous)

**Published by this service:**
- `IncidentCreated` → SNS Topic
- `IncidentStatusChanged` → SNS Topic

**Consumed by this service:**
- `ResourceDispatched` ← SQS Queue
- `EvacuationCompleted` ← SQS Queue
- `NewsVerified` ← SQS Queue

---

## 🧪 Testing

### Manual Testing

```bash
# Get API URL
cd terraform
terraform output api_gateway_url

# Create incident
curl -X POST "<API_URL>/incidents" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: $(uuidgen)" \
  -d '{
    "reporter_id": "1234567890123",
    "reporter_name": "Test User",
    "phone": "0812345678",
    "incident_type": "FLOOD",
    "location": {"type": "Point", "coordinates": [100.608, 14.072]},
    "description": "Test incident",
    "severity": "HIGH"
  }'

# List incidents
curl "<API_URL>/incidents?status=REPORTED&limit=10"

# Get incident detail
curl "<API_URL>/incidents/<INCIDENT_ID>"
```

### Automated Testing

```bash
./scripts/test-api.sh
```

---

## 📊 Database Schema

### Tables

- **Incidents**: Master incident data with spatial location
- **StatusHistory**: Audit trail of status changes
- **Reporter**: Information about incident reporters

### Indexes

- Spatial index on `location` (GIST)
- B-tree indexes on `status`, `severity`, `incident_type`, `created_at`

---

## 🔗 Integration with Other Services

### Upstream Services (ผู้เรียกใช้)

1. **Mobile App / Web Portal**
2. **RightCall Service** (Emergency Call)
3. **Disaster Scraping Service**
4. **Trusted News Outlets Service**
5. **PowerGrid Service**
6. **ResourceAllocation Service**
7. **Shelter Occupancy Service**
8. **AgencyResourceMatch Service**
9. **IncidentPrioritization Service**
10. **AlertResponse Service**

### Downstream Services (ผู้รับ Events)

All services subscribe to SNS topics for real-time updates.

---

## 🛠️ Development

### Project Structure

```
incident-reporter-service/
├── terraform/          # Infrastructure as Code
├── lambda/            # Lambda function code
│   ├── create-incident/
│   ├── update-status/
│   ├── get-incident/
│   ├── list-incidents/
│   ├── get-history/
│   ├── resource-dispatched-handler/
│   └── shared/        # Shared utilities
├── database/          # SQL schema
├── scripts/           # Deployment scripts
└── README.md
```

### Local Development

```bash
# Install dependencies
cd lambda
npm install

# Run tests (if any)
npm test

# Build layer
npm run build-layer
```

---

## 🗑️ Cleanup

To destroy all resources:

```bash
./scripts/destroy.sh
```

⚠️ **WARNING**: This will delete all data permanently!

---

## 📝 Environment Variables

Lambda functions use these environment variables:

- `DB_HOST`: RDS endpoint
- `DB_PORT`: PostgreSQL port (5432)
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `SNS_TOPIC_INCIDENT_CREATED`: SNS ARN
- `SNS_TOPIC_STATUS_CHANGED`: SNS ARN

---

## 🔒 Security

- API Gateway: API Key authentication (can be added)
- Lambda: IAM role with least privilege
- RDS: Security group restricts access
- Database: Encrypted at rest
- SNS/SQS: Message encryption

---

## 📈 Monitoring

- **CloudWatch Logs**: All Lambda functions log to CloudWatch
- **CloudWatch Metrics**: API Gateway and Lambda metrics
- **X-Ray**: Distributed tracing (can be enabled)

---

## 🤝 Contributing

This is a university project. For questions, contact:

**Student**: ธวัลหทัย เทียมทอง  
**Student ID**: 6609650111  
**Course**: Service-Oriented Architecture

---

## 📄 License

Academic use only.
