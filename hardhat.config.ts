import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import dotenv from "dotenv"; 

dotenv.config(); 

const alchemyApiKeyMainnet = process.env.ALCHEMY_API_KEY_MAINNET;

if (!alchemyApiKeyMainnet) {
  console.warn(
    "ALCHEMY_API_KEY_MAINNET is not set in .env file. Mainnet forking might fail."
  );
}

const config: HardhatUserConfig = {
  solidity: "0.8.24", // Your contract uses 0.8.24, ensure this matches
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKeyMainnet}`, 
        // blockNumber: 19_000_000 // Example, uncomment and set if you want to pin
      },
        chainId: 1,
    },
  },
};

export default config;
