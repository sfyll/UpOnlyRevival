import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { Address, GetContractReturnType, parseEther, formatEther, Hash, Hex, getAddress } from "viem";
import axios from "axios";

import * as dotenv from "dotenv";
dotenv.config(); 

// Import contract artifact type for Viem
import NftPoolAndTriggerBuyArtifact from "../artifacts/contracts/NftPoolAndTriggerBuy.sol/NftPoolAndTriggerBuy.json";
import IERC721Artifact from "@openzeppelin/contracts/build/contracts/IERC721.json";


// --- E2E Test Constants ---
const SEAPORT_ADDRESS_MAINNET = "0x0000000000000068F116a894984e2DB1123eB395" as const; // Seaport v1.6
const TARGET_NFT_CONTRACT_ADDRESS = "0x2a65b6c304246f1559cF337EB1590faDdB4a8c47" as const;
const TARGET_NFT_TOKEN_ID = 1n;
const TARGET_NFT_PRICE_ETH_STRING = "10000"; 
const TARGET_NFT_PRICE_WEI = parseEther(TARGET_NFT_PRICE_ETH_STRING); 
const ACTUAL_SELLER_ADDRESS = "0x2eb5e5713a874786af6da95f6e4deacedb5dc246" as const; 

// Burn address for verifying NFT burn
const BURN_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// OpenSea API Key from .env
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

// For unique wallet per tests
let cursor = 0;

// --- Types ---
type NftPoolContractType = GetContractReturnType<typeof NftPoolAndTriggerBuyArtifact.abi>;
type TargetNftContractType = GetContractReturnType<typeof IERC721Artifact.abi>; // Primarily for type checking

/**
 * @dev TypeScript interface for Seaport's EfficientBasicOrderParameters.
 *      Must match the Solidity struct `ISeaport.EfficientBasicOrderParameters`.
 */
interface BasicOrderParametersForEfficient {
    considerationToken: Address;
    considerationIdentifier: bigint;
    considerationAmount: bigint;
    offerer: Address;
    zone: Address;
    offerToken: Address;
    offerIdentifier: bigint;
    offerAmount: bigint;
    basicOrderType: number;
    startTime: bigint;
    endTime: bigint;
    zoneHash: Hex;
    salt: bigint;
    offererConduitKey: Hex;
    fulfillerConduitKey: Hex;
    totalOriginalAdditionalRecipients: bigint;
    additionalRecipients: Array<{ amount: bigint; recipient: Address }>;
    signature: Hex;
}

// --- Helper Functions ---

/**
 * Finds the order_hash for a specific NFT listing on OpenSea via their API.
 * @param nftContractAddr Address of the NFT contract.
 * @param tokenId ID of the token.
 * @param expectedPriceWei Expected price of the listing in Wei.
 * @param expectedSeller Address of the expected seller.
 * @returns The order_hash string if found, otherwise null.
 */
async function findOrderHash(
    nftContractAddr: Address,
    tokenId: string,
    expectedPriceWei: bigint,
    expectedSeller: Address
): Promise<string | null> {
    if (!OPENSEA_API_KEY) {
        console.error("OPENSEA_API_KEY not set in .env. Skipping findOrderHash.");
        return null;
    }
    try {
        const response = await axios.get(
            `https://api.opensea.io/v2/orders/ethereum/seaport/listings`,
            {
                params: { asset_contract_address: nftContractAddr, token_ids: tokenId, order_by: 'eth_price', order_direction: 'asc' },
                headers: { 'X-API-KEY': OPENSEA_API_KEY, 'accept': 'application/json' }
            }
        );

        if (response.data?.orders?.length > 0) {
            const orderData = response.data.orders.find((o: any) =>
                o.maker.address.toLowerCase() === expectedSeller.toLowerCase() &&
                BigInt(o.current_price) === expectedPriceWei &&
                o.protocol_address.toLowerCase() === SEAPORT_ADDRESS_MAINNET.toLowerCase()
            );
            if (orderData?.order_hash) {
                return orderData.order_hash;
            }
        }
    } catch (error: any) {
        console.error("Error finding order_hash from OpenSea API:", error.message);
    }
    console.error(`No matching order found for NFT ${nftContractAddr} #${tokenId} by ${expectedSeller} at ${formatEther(expectedPriceWei)} ETH.`);
    return null;
}

/**
 * Fetches fulfillment data for a Seaport order using the OpenSea API.
 * @param orderHash The hash of the Seaport order.
 * @param poolContractAddress The address of this application's contract that will act as the fulfiller.
 * @returns A promise that resolves to `BasicOrderParametersForEfficient` or null if an error occurs or data is invalid.
 */
async function fetchFulfillmentData(
    orderHash: string,
    poolContractAddress: Address
): Promise<BasicOrderParametersForEfficient | null> {
    if (!OPENSEA_API_KEY) {
        console.error("OPENSEA_API_KEY not set. Skipping fetchFulfillmentData.");
        return null;
    }
    if (!orderHash) {
        console.error("Order hash is required for fetchFulfillmentData. Skipping.");
        return null;
    }

    try {
        const response = await axios.post(
            `https://api.opensea.io/v2/listings/fulfillment_data`,
            {
                listing: { hash: orderHash, chain: "ethereum", protocol_address: SEAPORT_ADDRESS_MAINNET },
                fulfiller: { address: poolContractAddress }
            },
            { headers: { 'X-API-KEY': OPENSEA_API_KEY, 'Content-Type': 'application/json', 'accept': 'application/json' }}
        );

        const fulfillmentTx = response.data?.fulfillment_data?.transaction;
        const inputDataParams = fulfillmentTx?.input_data?.parameters;

        if (!inputDataParams || !fulfillmentTx) {
            console.error("Incomplete fulfillment data from OpenSea API.", response.data);
            return null;
        }

        if (!fulfillmentTx.function.includes("fulfillBasicOrder_efficient_6GL6yc")) {
            console.error(`OpenSea suggests fulfillment via '${fulfillmentTx.function}', not the expected efficient version.`);
        }
        
        // Basic validation of required fields (can be more extensive)
        const requiredFields = [ "considerationToken", "considerationIdentifier", "considerationAmount", "offerer", "zone", "offerToken", "offerIdentifier", "offerAmount", "basicOrderType", "startTime", "endTime", "zoneHash", "salt", "offererConduitKey", "fulfillerConduitKey", "totalOriginalAdditionalRecipients", "additionalRecipients", "signature"];
        for (const field of requiredFields) {
            if (typeof inputDataParams[field] === 'undefined') {
                console.error(`Missing field '${field}' in OpenSea API fulfillment input_data.parameters.`);
                return null;
            }
        }


        const seaportParams: BasicOrderParametersForEfficient = {
            considerationToken: inputDataParams.considerationToken,
            considerationIdentifier: BigInt(inputDataParams.considerationIdentifier),
            considerationAmount: BigInt(inputDataParams.considerationAmount),
            offerer: inputDataParams.offerer,
            zone: inputDataParams.zone,
            offerToken: inputDataParams.offerToken,
            offerIdentifier: BigInt(inputDataParams.offerIdentifier),
            offerAmount: BigInt(inputDataParams.offerAmount),
            basicOrderType: Number(inputDataParams.basicOrderType),
            startTime: BigInt(inputDataParams.startTime),
            endTime: BigInt(inputDataParams.endTime),
            zoneHash: inputDataParams.zoneHash,
            salt: BigInt(inputDataParams.salt),
            offererConduitKey: inputDataParams.offererConduitKey,
            fulfillerConduitKey: inputDataParams.fulfillerConduitKey,
            totalOriginalAdditionalRecipients: BigInt(inputDataParams.totalOriginalAdditionalRecipients),
            additionalRecipients: (inputDataParams.additionalRecipients as any[]).map(r => ({
                amount: BigInt(r.amount),
                recipient: r.recipient as Address
            })),
            signature: inputDataParams.signature,
        };

        console.log("Seaport params:", seaportParams);

        const requiredValueApi = BigInt(fulfillmentTx.value);
        let totalConsiderationToRecipients = seaportParams.considerationAmount;
        seaportParams.additionalRecipients.forEach(r => totalConsiderationToRecipients += r.amount);

        if (requiredValueApi !== TARGET_NFT_PRICE_WEI || totalConsiderationToRecipients !== TARGET_NFT_PRICE_WEI) {
            console.error(
                `Price mismatch: API total tx value (${formatEther(requiredValueApi)}), ` +
                `Calculated sum of considerations (${formatEther(totalConsiderationToRecipients)}), ` +
                `Pool target price (${formatEther(TARGET_NFT_PRICE_WEI)}).`
            );
            if (requiredValueApi !== TARGET_NFT_PRICE_WEI) return null;
        }
        return seaportParams;

    } catch (error: any) {
        console.error("Error fetching/processing OpenSea fulfillment data:", error.message);
        return null;
    }
}

// --- Test Suite ---
describe("NftPoolAndTriggerBuy", function () {
    let nftPool: NftPoolContractType;
    let nftPoolActualAddress: Address;
    let deployer: WalletClient;
    let publicClient: PublicClient;
    let liveFulfillmentParams: BasicOrderParametersForEfficient | null = null; // Updated type

    this.timeout(180000); 

    /**
     * Fixture to deploy the NftPoolAndTriggerBuy contract once before all E2E tests
     * and fetch live fulfillment parameters.
     */
    before(async function () {
        if (!OPENSEA_API_KEY) {
            console.warn("Skipping E2E before hook: OPENSEA_API_KEY not set.");
            this.skip(); // Skip all tests in this describe block if API key is missing
        }

        [deployer] = await hre.viem.getWalletClients();
        publicClient = await hre.viem.getPublicClient();

        const poolHash = await deployer.deployContract({
            abi: NftPoolAndTriggerBuyArtifact.abi,
            bytecode: NftPoolAndTriggerBuyArtifact.bytecode,
            args: [TARGET_NFT_CONTRACT_ADDRESS, TARGET_NFT_TOKEN_ID, TARGET_NFT_PRICE_WEI, SEAPORT_ADDRESS_MAINNET],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: poolHash });
        if (!receipt.contractAddress) throw new Error("Pool contract deployment failed in 'before' hook.");
        
        nftPoolActualAddress = receipt.contractAddress;
        nftPool = await hre.viem.getContractAt("NftPoolAndTriggerBuy", nftPoolActualAddress, { walletClient: deployer });

        const orderHash = await findOrderHash(
            TARGET_NFT_CONTRACT_ADDRESS,
            TARGET_NFT_TOKEN_ID.toString(),
            TARGET_NFT_PRICE_WEI,
            ACTUAL_SELLER_ADDRESS 
        );
        if (orderHash) {
            liveFulfillmentParams = await fetchFulfillmentData(orderHash, nftPoolActualAddress);
            if (!liveFulfillmentParams) {
                console.warn("Could not fetch or validate fulfillment parameters. E2E test might be skipped or fail.");
            }
        } else {
            console.warn("Could not find a suitable order_hash for E2E test. Test might be skipped or fail.");
        }
    });

    /**
     * Fixture to set up buyer and seller accounts, and fund the buyer for a purchase attempt.
     * Uses the contract instance deployed in the `before` hook.
     */
    async function setupE2ETestEnvironmentFixture() {
        const [, buyerWalletClient] = await hre.viem.getWalletClients();
        const targetNft = await hre.viem.getContractAt("IERC721", TARGET_NFT_CONTRACT_ADDRESS); // No walletClient needed for read

        const requiredEthForPurchase = TARGET_NFT_PRICE_WEI + parseEther("2"); // Buffer for gas
        await hre.network.provider.send("hardhat_setBalance", [
            buyerWalletClient.account.address,
            "0x" + requiredEthForPurchase.toString(16) as Hex,
        ]);

        const sellerToImpersonate = liveFulfillmentParams?.offerer || ACTUAL_SELLER_ADDRESS;
        if (sellerToImpersonate !== BURN_ADDRESS) { // Avoid impersonating burn address
             await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [sellerToImpersonate] });
             await hre.network.provider.send("hardhat_setBalance", [sellerToImpersonate, "0x" + parseEther("10").toString(16) as Hex]);
        }


        return {
            nftPool, // Re-uses the instance from the `before` hook
            targetNft,
            deployer, // Re-uses from `before`
            buyerWallet: buyerWalletClient,
            publicClient, // Re-uses from `before`
        };
    }
    
    describe("E2E Purchase Flow with fixed parameters", function () {
        it.only("should allow contribution, purchase the target NFT, burn it, and reflect correct state", async function () {
            const staticFulfillmentParams = getMockSeaportParams(); 

            const { nftPool: poolFromFixture, targetNft, buyerWallet, publicClient: clientFromFixture } =
                await loadFixture(setupE2ETestEnvironmentFixture);

            const purchaseTxHash = await poolFromFixture.write.contributeAndAttemptPurchase(
                [staticFulfillmentParams],
                { value: TARGET_NFT_PRICE_WEI, account: buyerWallet.account }
            );
            await clientFromFixture.waitForTransactionReceipt({ hash: purchaseTxHash });

            // Check for PurchaseAttempted event
            const purchaseAttemptEvents = await poolFromFixture.getEvents.PurchaseAttempted();
            const successfulPurchaseAttempt = purchaseAttemptEvents.find(
                (log) => log.args.initiator?.toLowerCase() === buyerWallet.account.address.toLowerCase() && log.args.success === true
            );
            expect(successfulPurchaseAttempt, "A successful PurchaseAttempted event should be emitted").to.exist;

            // Check for NftAcquiredAndBurned event
            const acquiredAndBurnedEvents = await poolFromFixture.getEvents.NftAcquiredAndBurned();
            expect(acquiredAndBurnedEvents.length, "NftAcquiredAndBurned event should be emitted once").to.equal(1);
            expect(acquiredAndBurnedEvents[0].args.tokenId, "Correct tokenId in NftAcquiredAndBurned event").to.equal(TARGET_NFT_TOKEN_ID);
            console.log(await poolFromFixture.read.currentState()); 
            // Check final contract state
            expect(await poolFromFixture.read.currentState()).to.equal(1, "Pool state should be NftAcquiredAndBurned (1)");

            // Verify NFT is burned (ownerOf should revert for non-existent token)
            try {
                await targetNft.read.ownerOf([TARGET_NFT_TOKEN_ID]);
                expect.fail("ownerOf should have reverted for a burned token, but it returned a value.");
            } catch (error: any) {
                // Error message can vary slightly based on ERC721 implementation.
                // OpenZeppelin's standard revert is "ERC721: invalid token ID" or "ERC721: owner query for nonexistent token"
                expect(error.message).to.match(/ERC721: (invalid token ID|owner query for nonexistent token)/,
                    "ownerOf call did not revert with the expected ERC721 error for a burned token."
                );
            }
        });
    });

    describe("E2E Purchase Flow", function () {
        it("should allow contribution, purchase the target NFT, burn it, and reflect correct state", async function () {
            if (!liveFulfillmentParams) {
                this.skip(); // Skip if live fulfillment params couldn't be fetched or were invalid
            }

            const { nftPool: poolFromFixture, targetNft, buyerWallet, publicClient: clientFromFixture } =
                await loadFixture(setupE2ETestEnvironmentFixture);

            const purchaseTxHash = await poolFromFixture.write.contributeAndAttemptPurchase(
                [liveFulfillmentParams],
                { value: TARGET_NFT_PRICE_WEI, account: buyerWallet.account }
            );
            const receipt = await clientFromFixture.waitForTransactionReceipt({ hash: purchaseTxHash });

            // Check for PurchaseAttempted event
            const purchaseAttemptEvents = await poolFromFixture.getEvents.PurchaseAttempted();
            const successfulPurchaseAttempt = purchaseAttemptEvents.find(
                (log) => log.args.initiator?.toLowerCase() === buyerWallet.account.address.toLowerCase() && log.args.success === true
            );
            expect(successfulPurchaseAttempt, "A successful PurchaseAttempted event should be emitted").to.exist;

            // Check for NftAcquiredAndBurned event
            const acquiredAndBurnedEvents = await poolFromFixture.getEvents.NftAcquiredAndBurned();
            expect(acquiredAndBurnedEvents.length, "NftAcquiredAndBurned event should be emitted once").to.equal(1);
            expect(acquiredAndBurnedEvents[0].args.tokenId, "Correct tokenId in NftAcquiredAndBurned event").to.equal(TARGET_NFT_TOKEN_ID);
            
            // Check final contract state
            expect(await poolFromFixture.read.currentState()).to.equal(1, "Pool state should be NftAcquiredAndBurned (1)");

            // Verify NFT is burned (ownerOf should revert for non-existent token)
            try {
                await targetNft.read.ownerOf([TARGET_NFT_TOKEN_ID]);
                expect.fail("ownerOf should have reverted for a burned token, but it returned a value.");
            } catch (error: any) {
                // Error message can vary slightly based on ERC721 implementation.
                // OpenZeppelin's standard revert is "ERC721: invalid token ID" or "ERC721: owner query for nonexistent token"
                expect(error.message).to.match(/ERC721: (invalid token ID|owner query for nonexistent token)/,
                    "ownerOf call did not revert with the expected ERC721 error for a burned token."
                );
            }
        });
    });

    describe("Unit Tests / Other Scenarios", function () {
        async function deployPoolFixture() {
            const wallets = await hre.viem.getWalletClients();
            const dep  = wallets[cursor++ % wallets.length];
            const user1 = wallets[cursor++ % wallets.length];
            const user2 = wallets[cursor++ % wallets.length];

            const pubClient = await hre.viem.getPublicClient();
            
            const pool = await hre.viem.deployContract("NftPoolAndTriggerBuy", [
                TARGET_NFT_CONTRACT_ADDRESS, // Using a mock/test NFT address might be better for pure unit tests
                TARGET_NFT_TOKEN_ID,
                TARGET_NFT_PRICE_WEI, // Price for unit test logic
                SEAPORT_ADDRESS_MAINNET, // Or a mock Seaport for pure unit tests
            ], { client: { wallet: dep } }) as NftPoolContractType;
            
            return { pool, deployer: dep, user1, user2, publicClient: pubClient };
        }

        it("should allow contributions and update totalRaisedWei", async function() {
            const { pool, user1 } = await loadFixture(deployPoolFixture);
            const contributionAmount = parseEther("0.1");
            
            await pool.write.contributeAndAttemptPurchase([
                // For this test, seaportOrderParams are not strictly needed if purchase isn't triggered
                // Or provide minimal valid-looking mock if contract requires it for non-purchase path
                getMockSeaportParams() // See helper function below
            ], { value: contributionAmount, account: user1.account });

            expect(await pool.read.totalRaisedWei()).to.equal(contributionAmount);
            expect(await pool.read.contributions([user1.account.address])).to.equal(contributionAmount);

            await pool.write.contributeAndAttemptPurchase([getMockSeaportParams()], { value: contributionAmount, account: user1.account });
             
            const logs = await pool.getEvents.Contributed();
            
            expect(getAddress(logs[0].args.contributor)).to.equal(getAddress(user1.account.address));
            expect(logs[0].args.amountWei).to.equal(contributionAmount);
        });

        it("should allow withdrawals when in Funding state", async function() {
            const { pool, user1 } = await loadFixture(deployPoolFixture);
            const contributionAmount = parseEther("1");
            await pool.write.contributeAndAttemptPurchase([getMockSeaportParams()], { value: contributionAmount, account: user1.account });
            
            const initialBalance = await publicClient.getBalance({ address: user1.account.address });
           
            const tx = await pool.write.withdrawContribution({ account: user1.account });
            const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
            const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
            const finalBalance = await publicClient.getBalance({ address: user1.account.address });
           
            const logs = await pool.getEvents.ContributionWithdrawn();
            expect(await pool.read.contributions([user1.account.address])).to.equal(0n);
            expect(await pool.read.totalRaisedWei()).to.equal(0n);
            expect(getAddress(logs[0].args.contributor)).to.equal(getAddress(user1.account.address));
            expect(logs[0].args.amountWei).to.equal(contributionAmount);
            expect(finalBalance + gasUsed).to.equal(initialBalance + contributionAmount);
        });

        it("should prevent withdrawals if not in Funding state", async function() {
            const { pool, user1 } = await loadFixture(deployPoolFixture);
            await expect(pool.write.withdrawContribution({ account: user1.account }))
                .to.be.rejected;
        });

        it("should allow deployer to enable emergency refunds", async function () {
          const { pool, deployer, publicClient } = await loadFixture(deployPoolFixture);

          const txHash = await pool.write.enableEmergencyRefund({ account: deployer.account });
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

          const logs = await pool.getEvents.EmergencyRefundEnabled({
            fromBlock: receipt.blockNumber,
            toBlock:   receipt.blockNumber,
          });
          expect(logs.length).to.equal(1);

          expect(await pool.read.currentState()).to.equal(2); 
        });


        it("should allow claiming emergency refunds", async function () {
          const { pool, deployer, user1, publicClient } = await loadFixture(deployPoolFixture);
          const amt = parseEther("1");

          await pool.write.contributeAndAttemptPurchase([getMockSeaportParams()], { value: amt, account: user1.account });
          await pool.write.enableEmergencyRefund({ account: deployer.account });

          await pool.write.claimEmergencyRefund({ account: user1.account });

          const logs = await pool.getEvents.RefundClaimed();

          expect(logs.length).to.equal(1);
          expect(getAddress(logs[0].args.contributor))
            .to.equal(getAddress(user1.account.address));
          expect(logs[0].args.amountWei).to.equal(amt);

          expect(await pool.read.contributions([user1.account.address])).to.equal(0n);
        });
    });
});

/**
 * Provides mock Seaport parameters for unit tests where the actual Seaport interaction is not the focus.
 */
function getMockSeaportParams(): BasicOrderParametersForEfficient {
    return {
      considerationToken: '0x0000000000000000000000000000000000000000',
      considerationIdentifier: 0n,
      considerationAmount: 9950000000000000000000n, // 9950 ETH
      offerer: '0x2eb5e5713a874786af6da95f6e4deacedb5dc246', // Actual seller from params
      zone: '0x0000000000000000000000000000000000000000',
      offerToken: '0x2a65b6c304246f1559cF337EB1590faDdB4a8c47', // Actual NFT contract from params
      offerIdentifier: 1n, // Actual token ID from params
      offerAmount: 1n,
      basicOrderType: 0,
      startTime: 1746646171n, // Use the actual start time
      endTime: 1751830171n,   // Use the actual end time
      zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: 27855337018906766782546881864045825683096516384821792734251842019849792390020n,
      offererConduitKey: '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
      fulfillerConduitKey: '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000', // This is often same as offererConduitKey or 0x for direct fills
      totalOriginalAdditionalRecipients: 1n,
      additionalRecipients: [
        {
          amount: 50000000000000000000n, // 50 ETH
          recipient: '0x0000a26b00c1f0df003000390027140000faa719'
        }
      ],
      signature: '0x3ebd1e52f7965294d0143e1a6fa12ae0aab521e074e4defb3410f287e84fc426058eaf1bcf5a175be49436f1b5153a4dc99b460c15051f810812fbe88bebb831'
    };
}
