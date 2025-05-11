// ignition/modules/NftPoolModule.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const DEFAULT_TARGET_NFT_CONTRACT = "0x2a65b6c304246f1559cF337EB1590faDdB4a8c47"; 
const DEFAULT_TARGET_TOKEN_ID   = 1n;
const DEFAULT_NFT_PRICE_WEI     = parseEther("10000");          
const DEFAULT_FUNDING_DURATION  = 60 * 60 * 24 * 7;            // 7 days
const DEFAULT_SEAPORT_ADDRESS   = "0x0000000000000068F116a894984e2DB1123eB395";

const NftPoolModule = buildModule("NftPoolModule", (m) => {
  // ---------- configurable params ----------
  const targetNftAddress = m.getParameter("targetNftAddress", DEFAULT_TARGET_NFT_CONTRACT);
  const targetTokenId    = m.getParameter("targetTokenId",    DEFAULT_TARGET_TOKEN_ID);
  const nftPriceWei      = m.getParameter("nftPriceWei",      DEFAULT_NFT_PRICE_WEI);
  const fundingDuration  = m.getParameter("fundingDuration",  DEFAULT_FUNDING_DURATION);
  const seaportAddress   = m.getParameter("seaportAddress",   DEFAULT_SEAPORT_ADDRESS);

  // ---------- deployment ----------
  const nftPool = m.contract("NftPoolAndTriggerBuy", [
    targetNftAddress,
    targetTokenId,
    nftPriceWei,
    fundingDuration,
    seaportAddress,
  ]);

  return { nftPool };
});

export default NftPoolModule;
