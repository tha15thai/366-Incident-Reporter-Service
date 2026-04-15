output "api_gateway_url" {
  description = "API Gateway URL"
  value       = "${aws_api_gateway_stage.v1.invoke_url}/incidents"
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "db_name" {
  description = "Database name"
  value       = var.db_name
}

output "db_username" {
  description = "Database username"
  value       = var.db_username
  sensitive   = true
}

output "sns_topic_incident_created_arn" {
  description = "SNS Topic ARN for IncidentCreated"
  value       = aws_sns_topic.incident_created.arn
}

output "sns_topic_status_changed_arn" {
  description = "SNS Topic ARN for IncidentStatusChanged"
  value       = aws_sns_topic.incident_status_changed.arn
}

output "sqs_resource_dispatched_url" {
  description = "SQS Queue URL for ResourceDispatched"
  value       = aws_sqs_queue.resource_dispatched.url
}
