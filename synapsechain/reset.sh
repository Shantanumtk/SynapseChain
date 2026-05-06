#!/bin/bash
echo "🔄 Resetting SynapseChain (wipes all chain data)..."
docker compose -f docker-compose.dev.yml down -v
docker volume rm synapsechain_ipfs_data 2>/dev/null || true
bash start.sh
