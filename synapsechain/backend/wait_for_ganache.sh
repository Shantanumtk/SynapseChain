#!/bin/sh
echo "Waiting for Ganache at $GANACHE_URL..."
until wget -qO- "$GANACHE_URL" --post-data='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' --header="Content-Type: application/json" > /dev/null 2>&1; do
  echo "  Ganache not ready — retrying in 2s..."
  sleep 2
done
echo "Ganache is up."

echo "Waiting for contract addresses..."
until [ -f /addresses.json ]; do
  echo "  Addresses not found — retrying in 3s..."
  sleep 3
done
echo "Contract addresses found."

exec uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
