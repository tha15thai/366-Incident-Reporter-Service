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


output "event_handler_lambda_arn" {
  description = "Lambda ARN for friends to subscribe their SNS to"
  value       = aws_lambda_function.event_handler.arn
}

output "portal_url" {
  description = "Reporter Portal Website URL"
  value       = "http://${aws_s3_bucket_website_configuration.portal.website_endpoint}"
}
