# SynapseChain
### A Blockchain-Powered Dual Marketplace for Human Knowledge and AI Data Licensing
**CPSC-559: Blockchain Technology | Final Project | California State University, Fullerton | Spring 2026**

---

## 👤 Team Member

| Field | Details |
|---|---|
| **Name** | Shantanu Mitkari |
| **CWID** | 824244867 |
| **Email** | shantanusmitkari@csu.fullerton.edu |
| **Team Size** | Solo (1 member) |

> **Note:** Solo presenter — Shantanu Mitkari

---

## 🔗 Project Repository

**GitHub:** [https://github.com/Shantanumtk/SynapseChain](https://github.com/Shantanumtk/SynapseChain)

---

## 📌 Project Description

SynapseChain is a fully functional decentralized dual marketplace built on the Ethereum blockchain (Ganache). It enables two types of transactions:

1. **Human → Human:** Selling knowledge as ERC-721 NFTs on a decentralized marketplace
2. **Human → AI:** Licensing personal data to AI companies under explicit on-chain consent agreements that can be revoked at any time

**Key components:**
- 6 Solidity smart contracts (ERC-721, ERC-20, Custom)
- 5 autonomous AI agents (LangGraph + OpenAI API)
- FastAPI backend with Web3.py blockchain integration
- React + Vite frontend with MetaMask + Ethers.js
- AWS EC2 deployment via Terraform + Docker Compose

---

## 🚀 Improvements

The project has been deployed to **AWS EC2 using Terraform** as an improvement over the local-only development setup:

- Terraform provisions an AWS EC2 instance automatically
- All services (Ganache, FastAPI backend, React frontend) run via Docker Compose on the EC2 instance
- Security groups configured to expose only required ports
- The live deployment is accessible via the EC2 public IP

This demonstrates real-world cloud deployment of a full-stack blockchain + agentic AI application.

---

## ⚙️ How to Run the Project

### Prerequisites
- Node.js v18+
- Python 3.11+
- Docker + Docker Compose
- MetaMask browser extension
- Ganache CLI or Ganache Desktop
- An OpenAI API key

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Shantanumtk/SynapseChain.git
cd SynapseChain
```

---

### Step 2 — Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:
```
OPENAI_API_KEY=your_openai_api_key
GANACHE_URL=http://localhost:8545
MNEMONIC=your_ganache_mnemonic
```

---

### Step 3 — Start Ganache (Local Blockchain)

**Option A: Ganache Desktop**
- Open Ganache Desktop
- Create a new workspace
- Set port to `8545`, Chain ID to `1337`

**Option B: Ganache CLI**
```bash
npx ganache --port 8545 --chainId 1337
```

---

### Step 4 — Deploy Smart Contracts

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network ganache
cd ..
```

This deploys all 6 contracts and saves ABIs to:
- `backend/core/abis/`
- `frontend/src/utils/abis/`

---

### Step 5 — Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
cd ..
```

- Backend: [http://localhost:8000](http://localhost:8000)
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 6 — Start the Frontend

```bash
cd frontend
npm install
npm run dev
cd ..
```

- Frontend: [http://localhost:5173](http://localhost:5173)

---

### Step 7 — Connect MetaMask

1. Open MetaMask in your browser
2. Add a new network:

| Field | Value |
|---|---|
| Network Name | SynapseChain Local |
| RPC URL | http://localhost:8545 |
| Chain ID | 1337 |
| Currency | ETH |

3. Import a test account using a private key from Ganache

---

### Step 8 — Run with Docker Compose

```bash
docker-compose up --build
```

This starts Ganache + backend + frontend together. Then follow Step 4 to deploy contracts.

---

### Step 9 — AWS EC2 Deployment via Terraform

```bash
cd infra
terraform init
terraform apply
cd ..
```

SSH into the EC2 instance and run Docker Compose there.

---

## 🎬 Demo Flow

1. Connect MetaMask wallet on the frontend
2. Go to **Knowledge Market** → Upload a knowledge asset
3. AI Quality Agent rates it, Valuation Agent prices it
4. NFT is minted and listed on the marketplace
5. Switch to a second MetaMask account → Buy the NFT
6. Go to **Data Licensing** → List data for AI licensing
7. Licensing Agent negotiates → deal recorded on-chain
8. Go to **My Assets** → Revoke consent → Consent Agent removes access
9. Go to **Bounty Board** → Post a bounty → Bounty Agent matches it

---

## 📄 Smart Contracts

| Contract | Standard | Purpose |
|---|---|---|
| `KnowledgeNFT.sol` | ERC-721 | Knowledge asset NFTs |
| `DataLicense.sol` | ERC-721 | AI data license tokens |
| `Marketplace.sol` | Custom | Buy/sell knowledge NFTs |
| `LicenseMarketplace.sol` | Custom | AI licensing transactions |
| `RewardToken.sol` | ERC-20 | Quality reward token |
| `BountyBoard.sol` | Custom | Bounty post + auto-payment |

---

## 🤖 AI Agents

| Agent | Function |
|---|---|
| Valuation Agent | Prices knowledge NFTs dynamically |
| Quality Agent | Rates uploaded knowledge content |
| Licensing Agent | Negotiates AI data license terms |
| Bounty Agent | Matches bounties to providers |
| Consent Agent | Handles on-chain consent revocation |

---

*SynapseChain | Shantanu Mitkari | CSUF Spring 2026*
