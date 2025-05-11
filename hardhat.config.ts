import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";     
import dotenv from "dotenv";
dotenv.config();

/* ─── ENV ─────────────────────────────────────────────────────────────── */
const ALCHEMY_KEY   = process.env.ALCHEMY_API_KEY_MAINNET ?? "";
const PRIVATE_KEY   = process.env.PRIVATE_KEY            ?? "";  
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY           ?? "";

/* ─── CONFIG ──────────────────────────────────────────────────────────── */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },   // match production bytecode
  },
  defaultNetwork: "hardhat",

  networks: {
    hardhat: {
      forking: ALCHEMY_KEY
        ? {
            url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
          }
        : undefined,
      chainId: 1,
    },

    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 1,
    },
  },

  etherscan: {
    apiKey: { mainnet: ETHERSCAN_KEY },       
  },
};

export default config;
