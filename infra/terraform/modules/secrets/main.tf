variable "name" { type = string }

resource "aws_secretsmanager_secret" "app" {
  name = "${var.name}/fraudshield/app"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    JWT_SECRET            = "replace-me"
    GATEWAY_INTERNAL_SECRET = "replace-me"
    FIELD_ENCRYPTION_KEY  = "replace-me"
    DATABASE_URL          = "postgresql://postgres:password@localhost:5432/fraudshield"
  })
}

output "secret_arn" { value = aws_secretsmanager_secret.app.arn }
