variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "sumonix-ai"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (development, staging, production)"
  type        = string
  default     = "staging"
}

variable "node_instance_type" {
  description = "EKS node instance type"
  type        = string
  default     = "t3.xlarge"
}

variable "node_count" {
  description = "Desired number of EKS nodes"
  type        = number
  default     = 2
}

variable "min_node_count" {
  description = "Minimum EKS nodes"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Maximum EKS nodes"
  type        = number
  default     = 5
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
