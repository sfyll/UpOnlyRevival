import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// ----------------------------------------------------------------------------
// MAINNET COBIE NFT DETAILS (These should remain the same)
// ----------------------------------------------------------------------------
const TARGET_NFT_CONTRACT_ADDRESS_MAINNET = "0x2a65b6c304246f1559cF337EB1590faDdB4a8c47" as `0x${string}`;
const TARGET_NFT_TOKEN_ID_MAINNET = 1n;
const TARGET_NFT_PRICE_ETH_STRING_MAINNET = "10000";
const TARGET_NFT_PRICE_WEI_MAINNET = parseEther(TARGET_NFT_PRICE_ETH_STRING_MAINNET);
const SEAPORT_ADDRESS_MAINNET = "0x0000000000000068F116a894984e2DB1123eB395" as `0x${string}`;

// ----------------------------------------------------------------------------
// MAINNET DEPLOYER CONFIGURATION
// ----------------------------------------------------------------------------
// IMPORTANT: Set these in your .env file and ensure .env is in .gitignore
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY as `0x${string}` | undefined;
const MAINNET_API_KEY = process.env.ALCHEMY_API_KEY_MAINNET as string ;
const MAINNET_RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${MAINNET_API_KEY}`;

if (!MAINNET_PRIVATE_KEY) {
  throw new Error("MAINNET_PRIVATE_KEY is not set in the .env file. Please add it to deploy to Mainnet.");
}
if (!MAINNET_RPC_URL) {
  throw new Error("MAINNET_RPC_URL is not set in the .env file (e.g., from Alchemy/Infura). Please add it.");
}

const account = privateKeyToAccount(MAINNET_PRIVATE_KEY);
const chain = mainnet; // Explicitly use Mainnet chain object

// ----------------------------------------------------------------------------
// RPC & clients for MAINNET
// ----------------------------------------------------------------------------
const publicClient = createPublicClient({
  chain,
  transport: http(MAINNET_RPC_URL), // Use the Mainnet RPC URL
});

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(MAINNET_RPC_URL), // Use the Mainnet RPC URL
});

// ----------------------------------------------------------------------------
// Artifact (compiled by Hardhat). Make sure `npx hardhat compile` ran first.
// ----------------------------------------------------------------------------
// Assuming your script is in a 'scripts' folder, adjust path if needed
import artifact from "../artifacts/contracts/NftPoolAndTriggerBuy.sol/NftPoolAndTriggerBuy.json" assert { type: "json" };
type Abi = typeof artifact.abi;

// ----------------------------------------------------------------------------
// Deploy to MAINNET
// ----------------------------------------------------------------------------
async function main() {
  console.log("\n🚨 DEPLOYING TO ETHEREUM MAINNET 🚨");
  console.log("========================================");
  console.log("Using Deployer Account:", account.address);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Deployer Balance:", formatEther(balance), "ETH");

  if (balance === 0n) {
    console.warn("⚠️ WARNING: Deployer account has 0 ETH. Deployment will likely fail.");
  }
  // Estimate gas (optional, but good for a heads-up)
  try {
    const estimatedGas = await publicClient.estimateContractGas({
        abi: artifact.abi as Abi,
        bytecode: artifact.bytecode as `0x${string}`,
        account: account,
        args: [
          TARGET_NFT_CONTRACT_ADDRESS_MAINNET,
          TARGET_NFT_TOKEN_ID_MAINNET,
          TARGET_NFT_PRICE_WEI_MAINNET,
          SEAPORT_ADDRESS_MAINNET,
        ],
    });
    const feeData = await publicClient.getGasPrice();
    const estimatedCost = feeData * estimatedGas;
    console.log(`Estimated deployment gas cost: ~${formatEther(estimatedCost)} ETH (Gas: ${estimatedGas}, Gas Price: ${feeData / 10n**9n} Gwei)`);
    if (balance < estimatedCost) {
        console.warn("⚠️ WARNING: Deployer account balance may be insufficient for estimated deployment cost.");
    }
  } catch(e: any) {
    console.warn("Could not estimate gas for deployment:", e.message);
  }


  console.log(`\nDeploying NftPoolAndTriggerBuy contract with parameters:
  ├─ Target NFT Address : ${TARGET_NFT_CONTRACT_ADDRESS_MAINNET}
  ├─ Target NFT Token ID: ${TARGET_NFT_TOKEN_ID_MAINNET}
  ├─ Target NFT Price   : ${TARGET_NFT_PRICE_ETH_STRING_MAINNET} ETH (${TARGET_NFT_PRICE_WEI_MAINNET} Wei)
  └─ Seaport Address    : ${SEAPORT_ADDRESS_MAINNET}\n`);

  // Confirmation step
  // You might want to add a readline prompt here for safety in a real script
  console.log("Proceeding with deployment in 10 seconds... Press CTRL+C to cancel.");
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10-second delay


  console.log("Sending deployment transaction...");
  const hash = await walletClient.deployContract({
    abi: artifact.abi as Abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [
      TARGET_NFT_CONTRACT_ADDRESS_MAINNET,
      TARGET_NFT_TOKEN_ID_MAINNET,
      TARGET_NFT_PRICE_WEI_MAINNET,
      SEAPORT_ADDRESS_MAINNET,
    ],
    // You might want to explicitly set gas price or maxFeePerGas/maxPriorityFeePerGas for Mainnet
    // For example:
    // gasPrice: parseGwei('20'), // Check current Mainnet gas prices!
  });
  console.log("Deployment transaction sent. Hash:", hash);
  console.log("Waiting for transaction confirmation (this may take a few minutes)...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("\n✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅");
  if (receipt.status === 'success') {
    console.log("🎉 Contract SUCCESSFULLY deployed to MAINNET! 🎉");
    console.log("   Address:", receipt.contractAddress);
  } else {
    console.error("💀 Contract deployment FAILED on MAINNET. 💀");
    console.error("   Receipt:", receipt);
  }
  console.log("✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅\n");

  if (receipt.contractAddress) {
    console.log("----------------------------------------------------");
    console.log("✏️  Update POOL_CONTRACT_ADDRESS in frontend/src/config.ts for PRODUCTION to:");
    console.log(`   ${receipt.contractAddress}`);
    console.log("----------------------------------------------------\n");
    console.log(`Verify on Etherscan: https://etherscan.io/address/${receipt.contractAddress}`);
  }
}

main().catch((err) => {
  console.error("\n❌ An error occurred during deployment:", err);
  process.exit(1);
});
