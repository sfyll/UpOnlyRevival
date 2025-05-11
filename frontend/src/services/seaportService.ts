import { type Address, type Hex } from 'viem';
// Import actual mainnet details for Cobie's NFT to use in the static params

export interface BasicOrderParametersForEfficient {
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

// --- STATIC SEAPORT PARAMETERS FOR COBIE'S NFT ---
const staticSeaportParams: BasicOrderParametersForEfficient = {
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

export async function getSeaportOrderParameters(
    _poolContractAddress: Address // Fulfiller address, not strictly needed if params are static but good to keep signature
): Promise<BasicOrderParametersForEfficient> {
    return staticSeaportParams;
}
