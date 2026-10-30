import { adminClient, currentUser } from "@/lib/supabase";
import type { Deal } from "@/lib/types";
import MintForm from "./MintForm";

export default async function MintPage({ searchParams }: { searchParams: Promise<{ deal?: string }> }) {
  const { deal: dealId } = await searchParams;
  let deal: Deal | null = null;

  // Prefill from a completed deal the user bought through SwitchTix.
  if (dealId) {
    const user = await currentUser();
    const { data } = await adminClient().from("deals").select("*").eq("id", dealId).maybeSingle();
    if (data && data.buyer_id === user!.id && data.status === "released") deal = data as Deal;
  }

  return (
    <>
      <h1>Mint a stub</h1>
      <p className="muted">
        Snap a photo of a paper stub or a screenshot of a digital ticket, fill in the details, and add a note so you
        remember the night.
      </p>
      <MintForm deal={deal} />
    </>
  );
}
