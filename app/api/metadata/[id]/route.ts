import { NextResponse } from "next/server";
import { adminClient, siteUrl, stubImageUrl } from "@/lib/supabase";
import { formatDate } from "@/lib/types";

/** ERC-721 metadata for a minted stub. Holds event facts and art only, no personal details. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: s } = await adminClient()
    .from("stubs")
    .select("id,event_name,event_date,venue,section,row_label,seat,image_path,deal_id")
    .eq("id", id)
    .maybeSingle();
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  const attributes = [
    { trait_type: "Event", value: s.event_name },
    s.venue && { trait_type: "Venue", value: s.venue },
    s.event_date && { trait_type: "Date", value: formatDate(s.event_date) },
    s.section && { trait_type: "Section", value: s.section },
    s.row_label && { trait_type: "Row", value: s.row_label },
    s.seat && { trait_type: "Seat", value: s.seat },
    { trait_type: "Attendance", value: s.deal_id ? "Verified via SwitchTix deal" : "Fan-submitted" },
  ].filter(Boolean);

  return NextResponse.json(
    {
      name: `${s.event_name} · SwitchTix Stub`,
      description: "A SwitchTix memory stub (beta, Base Sepolia test network).",
      image: stubImageUrl(s.image_path) ?? `${siteUrl()}/icon-512.png`,
      external_url: `${siteUrl()}/s/${s.id}`,
      attributes,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
