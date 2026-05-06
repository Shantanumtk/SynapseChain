const hre    = require("hardhat");
const fs     = require("fs");
const path   = require("path");
const ethers = hre.ethers;

const GANACHE_ACCOUNTS = [
  { index: 0, role: "deployer",    address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", privateKey: "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d" },
  { index: 1, role: "seller",      address: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0", privateKey: "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1" },
  { index: 2, role: "buyer",       address: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b", privateKey: "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c" },
  { index: 3, role: "ai_company",  address: "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d", privateKey: "0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913" },
  { index: 4, role: "test_user_4", address: "0xd03ea8624C8C5987235048901fB614fDcA89b117", privateKey: "0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743" },
  { index: 5, role: "test_user_5", address: "0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC", privateKey: "0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd" },
  { index: 6, role: "test_user_6", address: "0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9", privateKey: "0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52" },
  { index: 7, role: "test_user_7", address: "0x28a8746e75304c0780E011BEd21C72cD78cd535E", privateKey: "0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3" },
  { index: 8, role: "test_user_8", address: "0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E", privateKey: "0x829e924fdf021ba3dbbc4225edfece9efa46a61b86e852d20f5f7cf7c3e8fdf5" },
  { index: 9, role: "test_user_9", address: "0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e", privateKey: "0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773" },
];

function printAccounts() {
  console.log("\n" + "=".repeat(72));
  console.log("  GANACHE ACCOUNTS — import into MetaMask for demo");
  console.log("=".repeat(72));
  for (const a of GANACHE_ACCOUNTS) {
    console.log(`  [${a.index}] ${a.role.padEnd(12)}  ${a.address}`);
    console.log(`       KEY: ${a.privateKey}\n`);
  }
  console.log("  MetaMask: RPC http://localhost:8545  |  Chain ID 1337");
  console.log("=".repeat(72) + "\n");
}

async function main() {
  printAccounts();
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const KnowledgeNFT       = await ethers.deployContract("KnowledgeNFT");
  const DataLicense        = await ethers.deployContract("DataLicense");
  const RewardToken        = await ethers.deployContract("RewardToken");

  await Promise.all([
    KnowledgeNFT.waitForDeployment(),
    DataLicense.waitForDeployment(),
    RewardToken.waitForDeployment(),
  ]);

  const Marketplace = await ethers.deployContract("Marketplace", [
    await KnowledgeNFT.getAddress(),
    await RewardToken.getAddress(),
    deployer.address
  ]);
  const LicenseMarketplace = await ethers.deployContract("LicenseMarketplace", [
    await DataLicense.getAddress(),
    await RewardToken.getAddress()
  ]);
  const BountyBoard = await ethers.deployContract("BountyBoard");

  await Promise.all([
    Marketplace.waitForDeployment(),
    LicenseMarketplace.waitForDeployment(),
    BountyBoard.waitForDeployment(),
  ]);

  // KnowledgeNFT: keep deployer as owner (backend mints directly)
  // DataLicense: transfer to LicenseMarketplace (it calls createLicense)
  await DataLicense.transferOwnership(await LicenseMarketplace.getAddress());
  console.log("  DataLicense ownership -> LicenseMarketplace");

  // Grant MINTER_ROLE so both marketplaces can mint SYNR rewards
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await RewardToken.grantRole(MINTER_ROLE, await Marketplace.getAddress());
  await RewardToken.grantRole(MINTER_ROLE, await LicenseMarketplace.getAddress());
  console.log("  MINTER_ROLE granted -> Marketplace + LicenseMarketplace");

  const addresses = {
    KnowledgeNFT:       await KnowledgeNFT.getAddress(),
    DataLicense:        await DataLicense.getAddress(),
    RewardToken:        await RewardToken.getAddress(),
    Marketplace:        await Marketplace.getAddress(),
    LicenseMarketplace: await LicenseMarketplace.getAddress(),
    BountyBoard:        await BountyBoard.getAddress(),
  };
  console.table(addresses);

  const payload = JSON.stringify(addresses, null, 2);

  // Smart path — works both inside Docker (mounted volumes) and locally
  const backendPath  = fs.existsSync("/backend_core")
    ? "/backend_core/contract_addresses.json"
    : path.join(__dirname, "../../backend/core/contract_addresses.json");

  const frontendPath = fs.existsSync("/frontend_utils")
    ? "/frontend_utils/contractAddresses.js"
    : path.join(__dirname, "../../frontend/src/utils/contractAddresses.js");

  fs.writeFileSync(path.join(__dirname, "contract_addresses.json"), payload);
  fs.writeFileSync(backendPath, payload);
  fs.writeFileSync(frontendPath,
    `// Auto-generated by deploy.js — do not edit\nexport const CONTRACT_ADDRESSES = ${payload};\n`
  );

  console.log("Addresses written to backend + frontend.");
}

main().catch(e => { console.error(e); process.exit(1); });
