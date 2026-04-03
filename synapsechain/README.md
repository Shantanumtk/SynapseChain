# SynapseChain

> Blockchain-powered dual marketplace for human knowledge NFTs and AI data licensing.

## Dev (MacBook)
```bash
cp .env.example .env
docker-compose -f docker-compose.dev.yml up -d

# Compile + deploy contracts (run once after Ganache is healthy)
cd blockchain && npm install && npm run compile && npm run deploy:local
```

| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000/docs |
| Ganache  | http://localhost:8545      |

## Prod (EC2)
```bash
bash infra/ec2-setup.sh
docker-compose up -d --build
```
