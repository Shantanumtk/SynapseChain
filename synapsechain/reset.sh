#!/bin/bash
echo "🔄 Resetting SynapseChain (wipes all chain data)..."
docker-compose -f docker-compose.dev.yml down -v
bash start.sh
