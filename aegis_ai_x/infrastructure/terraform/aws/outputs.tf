output "eks_cluster_name" {
  value = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  value     = aws_eks_cluster.main.endpoint
  sensitive = true
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "rds_database_name" {
  value = aws_db_instance.postgres.db_name
}

output "vpc_id" {
  value = aws_vpc.main.id
}
