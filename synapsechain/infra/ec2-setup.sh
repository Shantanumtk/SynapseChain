#!/bin/bash
set -e
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker ubuntu
newgrp docker
git clone https://github.com/Shantanumtk/SynapseChain.git
cd SynapseChain
cp .env.example .env
echo "⚠️  Fill in .env then run: docker-compose up -d --build"
