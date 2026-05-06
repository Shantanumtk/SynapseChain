output "elastic_ip" {
  description = "Persistent public IP of the EC2 instance"
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "app_url" {
  description = "SynapseChain frontend (Vite dev server)"
  value       = "http://${aws_eip.app.public_ip}:5173"
}

output "api_docs_url" {
  description = "FastAPI Swagger docs"
  value       = "http://${aws_eip.app.public_ip}:8000/docs"
}

output "ganache_rpc_url" {
  description = "Ganache RPC — paste into MetaMask as the network RPC URL"
  value       = "http://${aws_eip.app.public_ip}:8545"
}

output "ssh_command" {
  description = "SSH into the instance"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_eip.app.public_ip}"
}

output "deploy_log_command" {
  description = "Stream the bootstrap log to watch deployment progress"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_eip.app.public_ip} 'tail -f /var/log/synapsechain-deploy.log'"
}
