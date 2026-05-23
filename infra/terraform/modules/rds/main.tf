variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db-subnets"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "this" {
  identifier             = "${var.name}-postgres"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t3.medium"
  allocated_storage      = 50
  username               = "postgres"
  password               = "change-me-in-secrets-manager"
  db_subnet_group_name   = aws_db_subnet_group.this.name
  skip_final_snapshot    = true
  storage_encrypted      = true
  publicly_accessible    = false
}

output "endpoint" { value = aws_db_instance.this.endpoint }
