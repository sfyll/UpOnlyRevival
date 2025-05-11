import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// ----------------------------------------------------------------------------
// MAINNET COBIE NFT DETAILS 
// ----------------------------------------------------------------------------
const TARGET_NFT_CONTRACT_ADDRESS_MAINNET = "0x2a65b6c304246f1559cF337EB1590faDdB4a8c47" as `0x${string}`;
const TARGET_NFT_TOKEN_ID_MAINNET = 1n;
const TARGET_NFT_PRICE_ETH_STRING_MAINNET = "10000";
const TARGET_NFT_PRICE_WEI_MAINNET = parseEther(TARGET_NFT_PRICE_ETH_STRING_MAINNET);
const SEAPORT_ADDRESS_MAINNET = "0x0000000000000068F116a894984e2DB1123eB395" as `0x${string}`;

// ----------------------------------------------------------------------------
// Select an Anvil signer 
// Override by exporting ANVIL_PRIVATE_KEY in your shell
// ----------------------------------------------------------------------------
const DEFAULT_ANVIL_PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

const account = privateKeyToAccount(
  (process.env.ANVIL_PRIVATE_KEY as `0x${string}` | undefined) ?? DEFAULT_ANVIL_PK,
);

// ----------------------------------------------------------------------------
// RPC & clients
// ----------------------------------------------------------------------------
const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545"; // anvil --fork
const chain = mainnet; // good enough for local fork

const publicClient = createPublicClient({ chain, transport: http(RPC) });
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(RPC),
});

// ----------------------------------------------------------------------------
// Artifact (compiled by Hardhat). Make sure `npx hardhat compile` ran first.
// ----------------------------------------------------------------------------
import artifact from "../artifacts/contracts/NftPoolAndTriggerBuy.sol/NftPoolAndTriggerBuy.json" assert { type: "json" };
type Abi = typeof artifact.abi;

// ----------------------------------------------------------------------------
// Deploy
// ----------------------------------------------------------------------------
async function main() {
  console.log("Using Anvil signer:", account.address);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance on fork:", formatEther(balance), "ETH\n");

  console.log(`Deploying NftPoolAndTriggerBuy for Cobie's NFT
  ├─ Target NFT  : ${TARGET_NFT_CONTRACT_ADDRESS_MAINNET}
  ├─ Token ID    : ${TARGET_NFT_TOKEN_ID_MAINNET}
  ├─ Total Price : ${TARGET_NFT_PRICE_ETH_STRING_MAINNET} ETH
  └─ Seaport     : ${SEAPORT_ADDRESS_MAINNET}\n`);

  const hash = await walletClient.deployContract({
    abi: artifact.abi as Abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [
      TARGET_NFT_CONTRACT_ADDRESS_MAINNET,
      TARGET_NFT_TOKEN_ID_MAINNET,
      TARGET_NFT_PRICE_WEI_MAINNET,
      SEAPORT_ADDRESS_MAINNET,
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("----------------------------------------------------");
  console.log("Contract deployed →", receipt.contractAddress);
  console.log("----------------------------------------------------");
  console.log("✏️  Update POOL_CONTRACT_ADDRESS_LOCAL in frontend/src/config/index.ts");
  console.log("----------------------------------------------------");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
