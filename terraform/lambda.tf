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
  environment {
    variables = local.lambda_environment
  }
}

# SNS Permissions
resource "aws_lambda_permission" "allow_friend_sns" {
  statement_id  = "AllowExecutionFromFriendSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.event_handler.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = "arn:aws:sns:us-east-1:620162259453:SendIncidentStatus"
}

resource "aws_lambda_permission" "allow_friend_sns_news_rejected" {
  statement_id  = "AllowExecutionFromFriendSNSRejected"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.event_handler.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = "arn:aws:sns:us-east-1:072833417664:reporter-news-rejected-topic"
}

resource "aws_lambda_permission" "allow_friend_sns_priority_verified" {
  statement_id  = "AllowExecutionFromFriendSNSPriorityVerified"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.event_handler.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = "arn:aws:sns:us-east-1:552692352531:incident-prioritized-topic"
}

# SQS Event Source Mapping (Friend's RESOLVED queue)
resource "aws_lambda_event_source_mapping" "resolved_handler_sqs" {
  event_source_arn = "arn:aws:sqs:us-east-1:217430480136:resource-events-incident-completed"
  function_name    = aws_lambda_function.event_handler.arn
  batch_size       = 5
  enabled          = true
}
