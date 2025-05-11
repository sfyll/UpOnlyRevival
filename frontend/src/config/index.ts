import { parseEther, type Chain } from 'viem';
import { mainnet } from 'viem/chains';

export const IS_DEVELOPMENT = import.meta.env.DEV;

export const LOCAL_RPC = 'http://127.0.0.1:8545';
let activeChainConfig: Chain;
if (IS_DEVELOPMENT) {
    // When using Anvil with --chain-id 1 to mimic mainnet for signature verification
    activeChainConfig = {
        ...mainnet,
        id: 1, // Ensure the ID is 1 for the chain object used by Viem
        // rpcUrls are not strictly needed here for publicClient if we override transport,
        // but good for completeness if something else tried to use them.
        rpcUrls: {
            default: { http: [LOCAL_RPC] },
            public: { http: [LOCAL_RPC] },
        }
    };
} else {
    activeChainConfig = mainnet;
}

export const ACTIVE_CHAIN: Chain = activeChainConfig;


export const POOL_CONTRACT_ADDRESS = '0xb2759d3f3487f52d45cc00c5b40f81f5e2e12d64' as `0x${string}`; 
export const TARGET_NFT_PRICE_ETH_STRING = "10000"; 
export const TARGET_NFT_PRICE_WEI = parseEther(TARGET_NFT_PRICE_ETH_STRING); 
export const TARGET_NFT_TOTAL_SUPPLY = 1; 
export const ACTUAL_SELLER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`;
export const TARGET_NFT_CONTRACT_ADDRESS = "0x2a65b6c304246f1559cF337EB1590faDdB4a8c47" as `0x${string}`; 
export const TARGET_NFT_TOKEN_ID_MAINNET = 1n;

export const SEAPORT_ADDRESS = "0x0000000000000068F116a894984e2DB1123eB395" as const;

