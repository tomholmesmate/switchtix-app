import { createPublicClient, createWalletClient, http, parseAbi, parseEventLogs, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const abi = parseAbi([
  "function mint(address to, string uri) returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

export const EXPLORER = "https://sepolia.basescan.org";

export function chainEnabled() {
  return Boolean(process.env.MINTER_PRIVATE_KEY && process.env.STUB_CONTRACT_ADDRESS);
}

function transport() {
  return http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");
}

function publicClient() {
  return createPublicClient({ chain: baseSepolia, transport: transport() });
}

/**
 * Mints a keepsake on Base Sepolia (a free test network).
 * For the beta, tokens are held by the app's own wallet; ownership per friend is tracked in the database.
 */
export async function sendMint(metadataUri: string): Promise<Hash> {
  const key = process.env.MINTER_PRIVATE_KEY!.trim();
  const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: transport() });
  return wallet.writeContract({
    address: process.env.STUB_CONTRACT_ADDRESS as `0x${string}`,
    abi,
    functionName: "mint",
    args: [account.address, metadataUri],
  });
}

/** Returns the token id once the mint is confirmed, "failed" if it reverted, or null if still pending. */
export async function checkMint(hash: Hash, timeoutMs = 0): Promise<string | "failed" | null> {
  const client = publicClient();
  try {
    const receipt =
      timeoutMs > 0
        ? await client.waitForTransactionReceipt({ hash, timeout: timeoutMs })
        : await client.getTransactionReceipt({ hash });
    if (receipt.status !== "success") return "failed";
    const logs = parseEventLogs({ abi, logs: receipt.logs, eventName: "Transfer" });
    return logs[0] ? logs[0].args.tokenId.toString() : null;
  } catch {
    return null; // not mined yet
  }
}
