require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" }
  },
  networks: {
    ganache: {
      url: process.env.GANACHE_URL || "http://127.0.0.1:8545",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 1337
    }
  },
  paths: {
    artifacts: "./artifacts",
    cache:     "./cache"
  }
};
