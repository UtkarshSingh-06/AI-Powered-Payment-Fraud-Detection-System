variable "name" { type = string }
variable "cidr" { type = string }

resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.name}-vpc" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr, 8, count.index + 1)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.name}-private-${count.index}" }
}

data "aws_availability_zones" "available" {}

output "vpc_id" { value = aws_vpc.this.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
