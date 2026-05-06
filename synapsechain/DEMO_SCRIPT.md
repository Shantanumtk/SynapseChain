# SynapseChain Demo Script
> CPSC-559 | Shantanu Mitkari

## Pre-Demo Checklist
```bash
cd synapsechain
docker-compose -f docker-compose.dev.yml up -d
cd blockchain && npm run fresh
curl http://localhost:8000/health
```

MetaMask — Add Network:
- RPC: http://localhost:8545
- Chain ID: 1337
- Name: Ganache Local

Import accounts (keys in ganache-accounts.json):
- Account 1 (seller):     0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1
- Account 2 (buyer):      0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c
- Account 3 (ai_company): 0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913

---

## Flow 1 — Knowledge NFT (3 min)
1. MetaMask -> Account 1 (seller)
2. Knowledge Market -> Connect Wallet
3. Fill form -> Evaluate & Price
   - Quality Agent scores content via OpenAI
   - Valuation Agent recommends ETH price
4. MetaMask confirm -> NFT minted + listed
5. MetaMask -> Account 2 (buyer)
6. Buy listing -> MetaMask confirm -> NFT transferred

## Flow 2 — Data Licensing + Negotiation (3 min)
1. MetaMask -> Account 1 (seller)
2. Data Licensing -> List Data Asset -> MetaMask confirm
3. MetaMask -> Account 3 (ai_company)
4. Simulate AI Buyer -> Start Negotiation
   - Multi-turn LangGraph agent negotiates terms
5. Execute Deal -> MetaMask confirm -> license on-chain
6. MetaMask -> Account 1 (seller)
7. My Assets -> Licenses -> Revoke Consent
   - Consent Agent validates ownership on-chain
   - MetaMask signs revocation tx
   - Badge flips to revoked, permanently logged

## Flow 3 — Bounty Board (2 min)
1. Bounty Board -> 3 pre-seeded bounties visible
2. Run Agent Match -> Bounty Agent ranks knowledge assets
3. Fulfill Bounty -> MetaMask -> ETH released

## Flow 4 — Swagger (1 min)
- http://localhost:8000/docs
- Live test POST /nft/evaluate
- Show POST /license/negotiate response

---

## If Something Breaks
| Problem | Fix |
|---|---|
| Wrong MetaMask network | Switch to Ganache Local, Chain ID 1337 |
| Backend error | docker-compose -f docker-compose.dev.yml logs backend |
| Contracts missing | cd blockchain && npm run fresh |
| OpenAI rate limit | Wait 10s, retry |
| Ganache reset | cd blockchain && npm run seed:local |
