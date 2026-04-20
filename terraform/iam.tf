# AWS Academy Learner Lab does NOT allow iam:CreateRole or iam:PutRolePolicy.
# LabRole is pre-created by the lab environment and already has all required
# permissions (Lambda, SNS, SQS, RDS, CloudWatch Logs, etc.).
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
