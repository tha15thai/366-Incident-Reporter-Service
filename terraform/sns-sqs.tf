# SNS Topics
resource "aws_sns_topic" "incident_created" {
  name = "${var.project_name}-incident-created"

  tags = {
    Name = "${var.project_name}-incident-created"
  }
}

# SNS Topic Policy - อนุญาตให้ Account เพื่อนสามารถ Subscribe ได้
resource "aws_sns_topic_policy" "incident_created" {
  arn = aws_sns_topic.incident_created.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowOwnerFullAccess"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "SNS:Publish",
          "SNS:Subscribe",
          "SNS:Receive",
          "SNS:GetTopicAttributes",
          "SNS:SetTopicAttributes",
          "SNS:DeleteTopic",
          "SNS:ListSubscriptionsByTopic",
          "SNS:AddPermission",
          "SNS:RemovePermission"
        ]
        Resource = aws_sns_topic.incident_created.arn
        Condition = {
          StringEquals = {
            "AWS:SourceOwner" = "317315311067"
          }
        }
      },
      {
        Sid    = "AllowCrossAccountSubscribe"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::709706489755:root",
            "arn:aws:iam::767398101278:root"
          ]
        }
        Action   = ["SNS:Subscribe", "SNS:Receive"]
        Resource = aws_sns_topic.incident_created.arn
      }
    ]
  })
}

# SNS Subscription - ชี้ไปที่ Lambda เพื่อน
# หมายเหตุ: เพื่อนต้องรัน aws lambda add-permission ก่อน แล้วค่อย uncomment และ apply อีกครั้ง
# resource "aws_sns_topic_subscription" "incident_created_to_friend_lambda" {
#   topic_arn = aws_sns_topic.incident_created.arn
#   protocol  = "lambda"
#   endpoint  = "arn:aws:lambda:us-east-1:709706489755:function:SyncIncidentHandler"
# }

resource "aws_sns_topic" "incident_status_changed" {
  name = "${var.project_name}-incident-status-changed"

  tags = {
    Name = "${var.project_name}-incident-status-changed"
  }
}

# SNS Topic Policy - อนุญาตให้ Account เพื่อนคนที่ 2 สามารถ Subscribe ได้
resource "aws_sns_topic_policy" "incident_status_changed" {
  arn = aws_sns_topic.incident_status_changed.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowOwnerFullAccess"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "SNS:Publish",
          "SNS:Subscribe",
          "SNS:Receive",
          "SNS:GetTopicAttributes",
          "SNS:SetTopicAttributes",
          "SNS:DeleteTopic",
          "SNS:ListSubscriptionsByTopic",
          "SNS:AddPermission",
          "SNS:RemovePermission"
        ]
        Resource = aws_sns_topic.incident_status_changed.arn
        Condition = {
          StringEquals = {
            "AWS:SourceOwner" = "317315311067"
          }
        }
      },
      {
        Sid    = "AllowCrossAccountSubscribeSQS"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::439140430379:root",
            "arn:aws:iam::813157187595:root"
          ]
        }
        Action   = ["SNS:Subscribe", "SNS:Receive"]
        Resource = aws_sns_topic.incident_status_changed.arn
      }
    ]
  })
}

# SNS Subscription - ชี้ไปที่ Lambda เพื่อนคนที่ 3 (impactZoneHandler)
# resource "aws_sns_topic_subscription" "incident_status_changed_to_friend3_lambda" {
#   topic_arn = aws_sns_topic.incident_status_changed.arn
#   protocol  = "lambda"
#   endpoint  = "arn:aws:lambda:us-east-1:813157187595:function:impactZoneHandler"
# }

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
