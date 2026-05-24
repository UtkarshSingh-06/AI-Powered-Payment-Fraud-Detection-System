variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

resource "aws_eks_cluster" "this" {
  name     = "${var.name}-eks"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.30"

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}

resource "aws_iam_role" "cluster" {
  name = "${var.name}-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cluster" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role" "nodes" {
  name = "${var.name}-eks-node-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "nodes_worker" {
  role       = aws_iam_role.nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "nodes_cni" {
  role       = aws_iam_role.nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "nodes_ecr" {
  role       = aws_iam_role.nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_eks_node_group" "default" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "${var.name}-default"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = var.subnet_ids
  scaling_config {
    desired_size = 2
    max_size     = 4
    min_size     = 1
  }
  instance_types = ["t3.medium"]
}

output "cluster_name" { value = aws_eks_cluster.this.name }
output "node_group" { value = aws_eks_node_group.default.node_group_name }
