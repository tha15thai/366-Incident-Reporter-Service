# SNS Topics
resource "aws_sns_topic" "incident_created" {
  name = "${var.project_name}-incident-created"
  
  tags = {
    Name = "${var.project_name}-incident-created"
  }
}

resource "aws_sns_topic" "incident_status_changed" {
  name = "${var.project_name}-incident-status-changed"
  
  tags = {
    Name = "${var.project_name}-incident-status-changed"
  }
}

# SQS Queues
resource "aws_sqs_queue" "resource_dispatched" {
  name                       = "${var.project_name}-resource-dispatched"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400
  
  tags = {
    Name = "${var.project_name}-resource-dispatched"
  }
}

resource "aws_sqs_queue" "resource_dispatched_dlq" {
  name = "${var.project_name}-resource-dispatched-dlq"
  
  tags = {
    Name = "${var.project_name}-resource-dispatched-dlq"
  }
}

resource "aws_sqs_queue_redrive_policy" "resource_dispatched" {
  queue_url = aws_sqs_queue.resource_dispatched.id
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.resource_dispatched_dlq.arn
    maxReceiveCount     = 3
  })
}
