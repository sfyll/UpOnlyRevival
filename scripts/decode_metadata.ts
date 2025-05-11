// scripts/decode-metadata.js
import { ethers, getAddress } from "ethers";
import bs58        from "bs58";
import cbor from "cbor";
import dotenv from "dotenv";
dotenv.config();

const RPC   = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_MAINNET}`
const addr  = getAddress("0xB2759D3f3487f52D45Cc00C5B40F81F5e2e12d64");                           // 0xYourContract

const provider = new ethers.JsonRpcProvider(RPC);

/* ---------- Helpers ---------- */
function bufferToSolc(buf) {
  // 0x00 0x08 0x18  → 0.8.24
  if (Buffer.isBuffer(buf) && buf.length === 3) {
    return `${buf[0]}.${buf[1]}.${buf[2]}`;
  }
  return buf.toString();            // fallback
}

function bufferToIpfs(buf) {
  return buf && buf.length ? `ipfs://${bs58.encode(buf)}` : undefined;
}

(async () => {
  console.log("hello");
  const bytecode = await provider.getCode(addr);
  const metaLen   = parseInt(bytecode.slice(-4), 16) * 2;     // bytes → hex chars
  const metaHex   = bytecode.slice(-4 - metaLen, -4);
  const meta      = cbor.decode(Buffer.from(metaHex, "hex"));

  const out = {
    solc      : bufferToSolc(meta.solc),
    optimizer : meta.o,                  // { enabled: true/false, runs: N }
    viaIR     : meta.ir ?? false,
    ipfs      : bufferToIpfs(meta.ipfs),
  };

  console.dir(out, { depth: null });
})();
