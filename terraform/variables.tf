variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  default     = "incident-reporter"
}

variable "db_username" {
  description = "Database username"
  default     = "incident_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  default     = "incident_db"
}
