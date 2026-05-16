# Lambda Layer
resource "aws_lambda_layer_version" "dependencies" {
  filename            = "../lambda/layers/dependencies.zip"
  layer_name          = "${var.project_name}-dependencies"
  compatible_runtimes = ["nodejs20.x"]
  source_code_hash    = filebase64sha256("../lambda/layers/dependencies.zip")
}

locals {
  lambda_environment = {
    DB_HOST                    = aws_db_instance.postgres.address
    DB_PORT                    = tostring(aws_db_instance.postgres.port)
    DB_NAME                    = var.db_name
    DB_USER                    = var.db_username
    DB_PASSWORD                = var.db_password
    SNS_TOPIC_INCIDENT_CREATED = aws_sns_topic.incident_created.arn
    SNS_TOPIC_STATUS_CHANGED   = aws_sns_topic.incident_status_changed.arn
  }
}

# 1. API Handler (Consolidates Create, Get, List, Update, History)
resource "aws_lambda_function" "api_handler" {
  filename         = "../lambda/api-handler.zip"
  function_name    = "${var.project_name}-api-handler"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/api-handler.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  environment {
    variables = local.lambda_environment
  }
}

# 2. Event Handler (Consolidates IN_PROGRESS, VERIFIED, REJECTED, RESOLVED)
resource "aws_lambda_function" "event_handler" {
  filename         = "../lambda/event-handler.zip"
  function_name    = "${var.project_name}-event-handler"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/event-handler.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  reserved_concurrent_executions = 2
  environment {
    variables = local.lambda_environment
  }
}

# SNS Permissions (Removed direct triggers in favor of SQS buffering)
# Note: Friends should now point their SNS subscriptions to our SQS Queue instead of our Lambda.

# ⚠️ รอเพื่อน 217430480136 เพิ่ม SQS Policy (Allow LabRole อ่าน Queue) ก่อน แล้วค่อย uncomment
# resource "aws_lambda_event_source_mapping" "resolved_handler_sqs" {
#   event_source_arn = "arn:aws:sqs:us-east-1:217430480136:resource-events-incident-completed"
#   function_name    = aws_lambda_function.event_handler.arn
#   batch_size       = 5
#   enabled          = true
# }

# SQS Event Source Mapping (Our local buffer queue)
resource "aws_lambda_event_source_mapping" "local_buffer_sqs" {
  event_source_arn = aws_sqs_queue.incident_input_queue.arn
  function_name    = aws_lambda_function.event_handler.arn
  batch_size       = 5
  enabled          = true
}
