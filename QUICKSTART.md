# 🚀 Quick Start Guide

## Step 1: Prerequisites ✓

- AWS Learner Lab (started)
- AWS CLI configured with credentials
- Terraform installed
- Node.js 18+
- PostgreSQL client (psql)

## Step 2: Deploy (5 minutes)

```bash
cd incident-reporter-service
chmod +x scripts/*.sh
./scripts/deploy.sh
```

Enter database password when prompted.

## Step 3: Setup Database

```bash
./scripts/setup-db.sh
```

## Step 4: Test

```bash
./scripts/test-api.sh
```

## Get Your Endpoints

```bash
cd terraform
terraform output api_gateway_url
terraform output sns_topic_incident_created_arn
terraform output sqs_resource_dispatched_url
```

## Cleanup

```bash
./scripts/destroy.sh
```

**Done! 🎉**
