# ── Latest Ubuntu 22.04 LTS AMI (us-west-2) ──────────────────────────────────
data "aws_ami" "ubuntu_22" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────
resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu_22.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.synapsechain.id]

  # Render the bootstrap script with the OpenAI key + repo URL injected
  user_data = templatefile("${path.module}/user_data.sh", {
    openai_api_key = var.openai_api_key
    repo_url       = var.repo_url
  })

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    delete_on_termination = true
    encrypted             = true
  }

  # Wait for instance status checks before Terraform declares it ready
  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name    = "${var.project_name}-app"
    Project = var.project_name
  }
}

# ── Elastic IP (persistent public IP survives stop/start) ────────────────────
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = {
    Name    = "${var.project_name}-eip"
    Project = var.project_name
  }
}
