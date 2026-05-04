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

resource "aws_lambda_function" "create_incident" {
  filename         = "../lambda/create-incident.zip"
  function_name    = "${var.project_name}-create-incident"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/create-incident.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  environment {
    variables = local.lambda_environment
  }
}

resource "aws_lambda_function" "get_incident" {
  filename         = "../lambda/get-incident.zip"
  function_name    = "${var.project_name}-get-incident"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/get-incident.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  environment {
    variables = local.lambda_environment
  }
}

resource "aws_lambda_function" "list_incidents" {
  filename         = "../lambda/list-incidents.zip"
  function_name    = "${var.project_name}-list-incidents"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/list-incidents.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  environment {
    variables = local.lambda_environment
  }
}

resource "aws_lambda_function" "update_status" {
  filename         = "../lambda/update-status.zip"
  function_name    = "${var.project_name}-update-status"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/update-status.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  environment {
    variables = local.lambda_environment
  }
}

resource "aws_lambda_function" "get_history" {
  filename         = "../lambda/get-history.zip"
  function_name    = "${var.project_name}-get-history"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/get-history.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  environment {
    variables = local.lambda_environment
  }
}

resource "aws_lambda_function" "resource_dispatched_handler" {
  filename         = "../lambda/resource-dispatched-handler.zip"
  function_name    = "${var.project_name}-resource-dispatched-handler"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/resource-dispatched-handler.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  environment {
    variables = local.lambda_environment
  }
}

resource "aws_lambda_event_source_mapping" "resource_dispatched" {
  event_source_arn = aws_sqs_queue.resource_dispatched.arn
  function_name    = aws_lambda_function.resource_dispatched_handler.arn
  batch_size       = 10
  enabled          = true
}

resource "aws_lambda_function" "changed_inprogress" {
  filename         = "../lambda/changedInprogress.zip"
  function_name    = "${var.project_name}-changedInprogress"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("../lambda/changedInprogress.zip")
  layers           = [aws_lambda_layer_version.dependencies.arn]
  environment {
    variables = local.lambda_environment
  }
}

resource "aws_lambda_permission" "allow_friend_sns" {
  statement_id  = "AllowExecutionFromFriendSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.changed_inprogress.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = "arn:aws:sns:us-east-1:620162259453:SendIncidentStatus"
}
