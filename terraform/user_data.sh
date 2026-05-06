#!/bin/bash
# EC2 bootstrap — runs once on first launch as root
# All output is tee'd to /var/log/synapsechain-deploy.log for easy debugging
exec > >(tee /var/log/synapsechain-deploy.log | logger -t synapsechain-deploy) 2>&1

set -euo pipefail

echo "=== [1/6] System update + dependencies ==="
apt-get update -y
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  lsb-release \
  unzip \
  jq

echo "=== [2/6] Install Docker Engine ==="
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

echo "=== [3/6] Clone repository ==="
cd /home/ubuntu
git clone "${repo_url}" SynapseChain
chown -R ubuntu:ubuntu SynapseChain

echo "=== [4/6] Write .env file ==="
cd /home/ubuntu/SynapseChain/synapsechain

cat > .env <<'ENVEOF'
# Ganache (internal Docker network)
GANACHE_URL=http://ganache:8545
DEPLOYER_PRIVATE_KEY=0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d

# OpenAI
OPENAI_API_KEY=${openai_api_key}

# AWS
AWS_REGION=us-west-2
ENVEOF

chown ubuntu:ubuntu .env
chmod 600 .env

echo "=== [5/6] Build + start dev containers ==="
sudo -u ubuntu bash -c "
  cd /home/ubuntu/SynapseChain/synapsechain
  docker compose -f docker-compose.dev.yml up -d --build
"

echo "=== [6/6] Wait for stack to be ready ==="
APP_DIR=/home/ubuntu/SynapseChain/synapsechain
MAX_WAIT=600
ELAPSED=0

# Step 6a — wait for deployer to finish writing contract addresses
echo "  Waiting for contract deployer..."
until sudo -u ubuntu docker compose -f \$APP_DIR/docker-compose.dev.yml logs deployer 2>/dev/null | grep -q "DEPLOY_DONE"; do
  if [ \$ELAPSED -ge \$MAX_WAIT ]; then
    echo "ERROR: deployer did not finish within \$MAX_WAIT seconds"
    sudo -u ubuntu docker compose -f \$APP_DIR/docker-compose.dev.yml logs --tail=50
    exit 1
  fi
  sleep 5
  ELAPSED=\$((ELAPSED + 5))
  echo "    ...(\$ELAPSED s)"
done
echo "  Contracts deployed!"

# Step 6b — wait for frontend dev server
echo "  Waiting for frontend..."
until curl -sf http://localhost:5173 > /dev/null 2>&1; do
  if [ \$ELAPSED -ge \$MAX_WAIT ]; then
    echo "ERROR: frontend did not become healthy within \$MAX_WAIT seconds"
    sudo -u ubuntu docker compose -f \$APP_DIR/docker-compose.dev.yml logs --tail=50
    exit 1
  fi
  sleep 5
  ELAPSED=\$((ELAPSED + 5))
  echo "    ...(\$ELAPSED s)"
done
echo "  Frontend ready!"

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo ""
echo "============================================"
echo "  SynapseChain is live!"
echo "  Frontend  → http://\$PUBLIC_IP:5173"
echo "  API Docs  → http://\$PUBLIC_IP:8000/docs"
echo "  Ganache   → http://\$PUBLIC_IP:8545"
echo "============================================"
