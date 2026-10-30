import { adminClient, siteUrl } from "./supabase";
import { chainEnabled, checkMint, sendMint } from "./chain";
import type { Hash } from "viem";

/** Starts a mint for a stub and waits briefly for confirmation. Never throws. */
export async function mintStub(stubId: string) {
  if (!chainEnabled()) return;
  const db = adminClient();
  try {
    const hash = await sendMint(`${siteUrl()}/api/metadata/${stubId}`);
    await db.from("stubs").update({ mint_status: "minting", tx_hash: hash }).eq("id", stubId);
    const result = await checkMint(hash, 8000);
    if (result === "failed") {
      await db.from("stubs").update({ mint_status: "failed" }).eq("id", stubId);
    } else if (result) {
      await db.from("stubs").update({ mint_status: "minted", token_id: result }).eq("id", stubId);
    }
  } catch (err) {
    console.error("Mint failed", err);
    await db.from("stubs").update({ mint_status: "failed" }).eq("id", stubId);
  }
}

/** If a mint was still pending, check once more and record the result. */
export async function refreshMint(stub: { id: string; mint_status: string; tx_hash: string | null }) {
  if (stub.mint_status !== "minting" || !stub.tx_hash || !chainEnabled()) return stub.mint_status;
  const result = await checkMint(stub.tx_hash as Hash);
  if (!result) return stub.mint_status;
  const db = adminClient();
  if (result === "failed") {
    await db.from("stubs").update({ mint_status: "failed" }).eq("id", stub.id);
    return "failed";
  }
  await db.from("stubs").update({ mint_status: "minted", token_id: result }).eq("id", stub.id);
  return "minted";
}
