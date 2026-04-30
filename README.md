=============================================================
  SynapseChain — CPSC-559 Final Project
  California State University, Fullerton | Spring 2026
=============================================================

------------------------------------------------------------
TEAM MEMBER
------------------------------------------------------------
Name   : Shantanu Mitkari
CWID   : 824244867
Email  : shantanusmitkari@csu.fullerton.edu

------------------------------------------------------------
PROJECT REPOSITORY
------------------------------------------------------------
GitHub : https://github.com/Shantanumtk/SynapseChain

Note   : Solo presenter — Shantanu Mitkari will demo in person.

------------------------------------------------------------
PROJECT DESCRIPTION
------------------------------------------------------------
SynapseChain is a fully functional decentralized dual
marketplace built on the Ethereum blockchain (Ganache).

It enables two types of transactions:
  1. Humans selling knowledge to other humans as ERC-721 NFTs
  2. Humans licensing their data to AI companies under
     explicit on-chain consent agreements (revocable anytime)

Key components:
  - 6 Solidity smart contracts (ERC-721, ERC-20, Custom)
  - 5 autonomous AI agents (LangGraph + OpenAI API)
  - FastAPI backend with Web3.py blockchain integration
  - React + Vite frontend with MetaMask + Ethers.js
  - AWS EC2 deployment via Terraform + Docker Compose

------------------------------------------------------------
IMPROVEMENTS
------------------------------------------------------------
The project has been deployed to AWS EC2 using Terraform
as an improvement over the local-only development setup.

  - Terraform provisions an AWS EC2 instance automatically
  - All services (Ganache, FastAPI backend, React frontend)
    run via Docker Compose on the EC2 instance
  - Security groups configured to expose only required ports
  - The live deployment can be accessed via the EC2 public IP

This improvement demonstrates real-world cloud deployment
of a full-stack blockchain + agentic AI application.

------------------------------------------------------------
HOW TO RUN THE PROJECT
------------------------------------------------------------

PREREQUISITES
  - Node.js v18+
  - Python 3.11+
  - Docker + Docker Compose
  - MetaMask browser extension
  - Ganache CLI or Ganache Desktop
  - An OpenAI API key

------------------------------------------------------------
STEP 1 — Clone the repository
------------------------------------------------------------
  git clone https://github.com/Shantanumtk/SynapseChain.git
  cd SynapseChain

------------------------------------------------------------
STEP 2 — Set up environment variables
------------------------------------------------------------
  cp .env.example .env

  Edit .env and fill in:
    OPENAI_API_KEY=your_openai_api_key
    GANACHE_URL=http://localhost:8545
    MNEMONIC=your_ganache_mnemonic

------------------------------------------------------------
STEP 3 — Start Ganache (local blockchain)
------------------------------------------------------------
  Option A: Ganache Desktop
    - Open Ganache Desktop
    - Create a new workspace
    - Set port to 8545, Chain ID to 1337

  Option B: Ganache CLI
    npx ganache --port 8545 --chainId 1337

------------------------------------------------------------
STEP 4 — Deploy smart contracts
------------------------------------------------------------
  cd blockchain
  npm install
  npx hardhat compile
  npx hardhat run scripts/deploy.js --network ganache
  cd ..

  This will deploy all 6 contracts and save ABIs to:
    backend/core/abis/
    frontend/src/utils/abis/

------------------------------------------------------------
STEP 5 — Start the backend
------------------------------------------------------------
  cd backend
  pip install -r requirements.txt
  uvicorn api.main:app --reload --port 8000
  cd ..

  Backend runs at: http://localhost:8000
  API docs at:     http://localhost:8000/docs

------------------------------------------------------------
STEP 6 — Start the frontend
------------------------------------------------------------
  cd frontend
  npm install
  npm run dev
  cd ..

  Frontend runs at: http://localhost:5173

------------------------------------------------------------
STEP 7 — Connect MetaMask
------------------------------------------------------------
  1. Open MetaMask in your browser
  2. Add a new network:
       Network Name : SynapseChain Local
       RPC URL      : http://localhost:8545
       Chain ID     : 1337
       Currency     : ETH
  3. Import a test account using a private key from Ganache

------------------------------------------------------------
STEP 8 — (Optional) Run with Docker Compose
------------------------------------------------------------
  docker-compose up --build

  This starts Ganache + backend + frontend together.
  Then follow Step 4 to deploy contracts.

------------------------------------------------------------
STEP 9 — (Optional) AWS EC2 Deployment via Terraform
------------------------------------------------------------
  cd infra
  terraform init
  terraform apply
  cd ..

  SSH into the EC2 instance and run Docker Compose there.

------------------------------------------------------------
DEMO FLOW
------------------------------------------------------------
  1. Connect MetaMask wallet on the frontend
  2. Go to Knowledge Market → Upload a knowledge asset
  3. AI Quality Agent rates it, Valuation Agent prices it
  4. NFT is minted and listed on the marketplace
  5. Switch to a second MetaMask account → Buy the NFT
  6. Go to Data Licensing → List data for AI licensing
  7. Licensing Agent negotiates → deal recorded on-chain
  8. Go to My Assets → Revoke consent → Consent Agent removes access
  9. Go to Bounty Board → Post a bounty → Bounty Agent matches it

------------------------------------------------------------
SMART CONTRACTS
------------------------------------------------------------
  KnowledgeNFT.sol      — ERC-721: knowledge asset NFTs
  DataLicense.sol       — ERC-721: AI data license tokens
  Marketplace.sol       — Buy/sell knowledge NFTs
  LicenseMarketplace.sol — AI licensing transactions
  RewardToken.sol       — ERC-20: quality reward token
  BountyBoard.sol       — Bounty post + auto-payment

------------------------------------------------------------
AI AGENTS
------------------------------------------------------------
  Valuation Agent  — Prices knowledge NFTs dynamically
  Quality Agent    — Rates uploaded knowledge content
  Licensing Agent  — Negotiates AI data license terms
  Bounty Agent     — Matches bounties to providers
  Consent Agent    — Handles on-chain consent revocation

=============================================================
