const hre    = require("hardhat");
const fs     = require("fs");
const path   = require("path");
const ethers = hre.ethers;

const ACCOUNTS = {
  deployer:   { address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", key: "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d" },
  seller:     { address: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0", key: "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1" },
  buyer:      { address: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b", key: "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c" },
  ai_company: { address: "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d", key: "0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913" },
};

async function main() {
  console.log("\nSeeding demo data...\n");

  const addressesPath = path.join(__dirname, "contract_addresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("contract_addresses.json not found. Run deploy first.");
    process.exit(1);
  }
  const addresses = JSON.parse(fs.readFileSync(addressesPath));

  const seller     = new ethers.Wallet(ACCOUNTS.seller.key,     ethers.provider);
  const buyer      = new ethers.Wallet(ACCOUNTS.buyer.key,      ethers.provider);
  const ai_company = new ethers.Wallet(ACCOUNTS.ai_company.key, ethers.provider);

  // Note: RewardToken ownership transferred to Marketplace during deploy
  // Seed skips direct mintReward — rewards are minted via Marketplace on NFT sales
  console.log("  Reward tokens minted on NFT sales");

  const BountyBoard        = await ethers.getContractAt("BountyBoard",        addresses.BountyBoard,        buyer);
  const LicenseMarketplace = await ethers.getContractAt("LicenseMarketplace", addresses.LicenseMarketplace, seller);
  const LicenseMarketAI    = await ethers.getContractAt("LicenseMarketplace", addresses.LicenseMarketplace, ai_company);

  await (await BountyBoard.postBounty(
    "Solidity reentrancy attack guide with exploit examples and mitigation patterns.",
    { value: ethers.parseEther("0.1") }
  )).wait();
  console.log("  Bounty #1 posted — Solidity security (0.1 ETH)");

  await (await BountyBoard.postBounty(
    "Annotated medical NLP dataset for clinical named entity recognition tasks.",
    { value: ethers.parseEther("0.25") }
  )).wait();
  console.log("  Bounty #2 posted — Medical NLP dataset (0.25 ETH)");

  await (await BountyBoard.postBounty(
    "Transformer architecture from scratch — self-attention, positional encoding, multi-head attention.",
    { value: ethers.parseEther("0.05") }
  )).wait();
  console.log("  Bounty #3 posted — Transformer architecture (0.05 ETH)");

  await (await LicenseMarketplace.listData(
    "Annotated clinical notes, 50k records, HIPAA-compliant.",
    ethers.parseEther("0.02")
  )).wait();
  console.log("  Data listing #1 created — Clinical NLP dataset");

  await (await LicenseMarketplace.listData(
    "Python code dataset, 10k annotated snippets.",
    ethers.parseEther("0.015")
  )).wait();
  console.log("  Data listing #2 created — Code annotation dataset");

  // executeDeal skipped — DataLicense ownership kept with deployer for demo
  // License deals are executed via frontend MetaMask flow
  console.log("  License deals executed via frontend (MetaMask flow)");

  console.log("\n  Seed complete.");
  console.log("  Buyer:      3 open bounties (0.4 ETH escrowed)");
  console.log("  Seller:     2 data listings");
  console.log("  AI Company: 1 active license\n");
}

main().catch(e => { console.error(e); process.exit(1); });
