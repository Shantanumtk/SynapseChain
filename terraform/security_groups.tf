# ── SynapseChain Security Group ───────────────────────────────────────────────
resource "aws_security_group" "synapsechain" {
  name        = "${var.project_name}-sg"
  description = "SynapseChain application security group"
  vpc_id      = aws_vpc.main.id

  # ── Inbound ────────────────────────────────────────────────────────────────

  # SSH — restrict to your IP in production via allowed_ssh_cidr variable
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # HTTPS — reserved for future SSL/TLS termination
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Frontend — Vite dev server (docker-compose.dev.yml exposes 5173 directly)
  ingress {
    description = "Frontend dev server"
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend — FastAPI (docker-compose.dev.yml exposes 8000 directly)
  ingress {
    description = "Backend API"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ganache RPC — MetaMask connects here to the local testnet (chainId 1337)
  ingress {
    description = "Ganache RPC"
    from_port   = 8545
    to_port     = 8545
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # ── Outbound (all traffic — needed for Docker Hub, OpenAI API, apt, etc.) ──
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-sg"
    Project = var.project_name
  }
}
