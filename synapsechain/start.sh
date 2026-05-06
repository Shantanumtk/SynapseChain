#!/bin/bash
set -e

echo "🔗 SynapseChain — Starting up..."

# Check .env exists
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "⚠️  Created .env from .env.example — add your OPENAI_API_KEY then rerun"
    exit 1
  else
    echo "❌ No .env file found. Create one with OPENAI_API_KEY=sk-..."
    exit 1
  fi
fi

# Check OPENAI_API_KEY is set
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
  echo "❌ OPENAI_API_KEY not set in .env"
  exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.dev.yml down 2>/dev/null || true

# Start fresh
echo "🚀 Starting containers..."
docker compose -f docker-compose.dev.yml up -d --build

# Wait for deployer to finish
echo "⏳ Waiting for contracts to deploy..."
until docker compose -f docker-compose.dev.yml logs deployer 2>/dev/null | grep -q "DEPLOY_DONE"; do
  sleep 3
  printf "."
done
echo ""
echo "✅ Contracts deployed!"

# Wait for backend
echo "⏳ Waiting for backend..."
until curl -s http://localhost:8000/health > /dev/null 2>&1; do
  sleep 2
  printf "."
done
echo ""
echo "✅ Backend ready!"

# Wait for frontend
echo "⏳ Waiting for frontend..."
until curl -s http://localhost:5173 > /dev/null 2>&1; do
  sleep 2
  printf "."
done
echo ""
echo "✅ Frontend ready!"

echo ""
echo "============================================"
echo "  SynapseChain is running!"
echo "============================================"
echo "  Frontend  →  http://localhost:5173"
echo "  API Docs  →  http://localhost:8000/docs"
echo "  Ganache   →  http://localhost:8545"
echo ""
echo "  MetaMask setup:"
echo "  RPC:      http://localhost:8545"
echo "  Chain ID: 1337"
echo ""
echo "  Demo accounts (import to MetaMask):"
echo "--------------------------------------------"
echo "  Seller"
echo "  Address:  0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0"
echo "  Key:      0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1"
echo ""
echo "  Buyer"
echo "  Address:  0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"
echo "  Key:      0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c"
echo ""
echo "  AI Company"
echo "  Address:  0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d"
echo "  Key:      0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913"
echo "--------------------------------------------"
echo "============================================"
