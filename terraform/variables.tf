variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Prefix applied to all resource names"
  type        = string
  default     = "synapsechain"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "AZ for the public subnet"
  type        = string
  default     = "us-west-2a"
}

variable "instance_type" {
  description = "EC2 instance type (t3.medium minimum for running all containers)"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Name of an existing EC2 Key Pair for SSH access"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the instance (restrict to your IP for production)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "openai_api_key" {
  description = "OpenAI API key injected into the EC2 .env file"
  type        = string
  sensitive   = true
}

variable "repo_url" {
  description = "Git repository URL to clone on the EC2 instance"
  type        = string
  default     = "https://github.com/ShantanuMtk/SynapseChain.git"
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 30
}
