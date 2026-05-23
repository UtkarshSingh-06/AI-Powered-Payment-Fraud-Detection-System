variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

# MSK cluster placeholder — configure security groups and broker nodes in production
output "bootstrap_brokers" {
  value = "kafka.${var.name}.internal:9092"
}
