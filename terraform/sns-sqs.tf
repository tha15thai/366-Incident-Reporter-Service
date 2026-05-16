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
            "AWS:SourceOwner" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AllowCrossAccountSubscribe"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::709706489755:root",
            "arn:aws:iam::552692352531:root"
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

# ⚠️ รอเพื่อน 072833417664 เพิ่ม SQS Policy ก่อน แล้วค่อย uncomment
# resource "aws_sns_topic_subscription" "incident_created_to_friend_sqs" {
#   topic_arn            = aws_sns_topic.incident_created.arn
#   protocol             = "sqs"
#   endpoint             = "arn:aws:sqs:us-east-1:072833417664:incident-reporter-queue"
#   raw_message_delivery = true
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
            "AWS:SourceOwner" = data.aws_caller_identity.current.account_id
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

# --- New SQS Queue to Buffer Incoming Messages ---

resource "aws_sqs_queue" "incident_input_queue" {
  name                      = "${var.project_name}-incident-input-queue"
  message_retention_seconds = 86400
  visibility_timeout_seconds = 60 # Match or exceed Lambda timeout (30s)

  tags = {
    Name = "${var.project_name}-incident-input-queue"
  }
}

resource "aws_sqs_queue_policy" "incident_input_policy" {
  queue_url = aws_sqs_queue.incident_input_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.incident_input_queue.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = [
              "arn:aws:sns:us-east-1:620162259453:SendIncidentStatus",
              "arn:aws:sns:us-east-1:072833417664:reporter-news-rejected-topic",
              "arn:aws:sns:us-east-1:552692352531:incident-prioritized-topic"
            ]
          }
        }
      }
    ]
  })
}

# --- Subscribing our Queue to Friends' SNS Topics ---
# ⚠️ Cross-Account: เราไม่สามารถ Subscribe จากฝั่งเราเองได้
# เพื่อนต้องเป็นคนสร้าง Subscription จาก SNS ของเขา → SQS ของเรา
# ให้ส่ง SQS ARN นี้ให้เพื่อนไปทำต่อ:
#   SQS ARN = aws_sqs_queue.incident_input_queue.arn (ดูจาก output หลัง apply)
#
# resource "aws_sns_topic_subscription" "friend1_to_our_sqs" {
#   topic_arn = "arn:aws:sns:us-east-1:620162259453:SendIncidentStatus"
#   protocol  = "sqs"
#   endpoint  = aws_sqs_queue.incident_input_queue.arn
# }
#
# resource "aws_sns_topic_subscription" "friend2_to_our_sqs" {
#   topic_arn = "arn:aws:sns:us-east-1:072833417664:reporter-news-rejected-topic"
#   protocol  = "sqs"
#   endpoint  = aws_sqs_queue.incident_input_queue.arn
# }
#
# resource "aws_sns_topic_subscription" "friend3_to_our_sqs" {
#   topic_arn = "arn:aws:sns:us-east-1:552692352531:incident-prioritized-topic"
#   protocol  = "sqs"
#   endpoint  = aws_sqs_queue.incident_input_queue.arn
# }
