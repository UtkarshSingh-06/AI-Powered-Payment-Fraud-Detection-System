variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

output "redis_endpoint" {
  value = "redis.${var.name}.internal:6379"
}
