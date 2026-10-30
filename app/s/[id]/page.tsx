import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Keepsake from "@/components/Keepsake";
import { refreshMint } from "@/lib/mint";
import { adminClient, currentUser, stubImageUrl } from "@/lib/supabase";
import type { Stub } from "@/lib/types";
import ShareButton from "./ShareButton";

async function getStub(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await adminClient().from("stubs").select("*").eq("id", id).maybeSingle();
  return data as Stub | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const stub = await getStub((await params).id);
  if (!stub) return { title: "SwitchTix" };
  const img = stubImageUrl(stub.image_path);
  return {
    title: `${stub.event_name} · SwitchTix stub`,
    description: `${stub.owner_name ?? "A fan"} was there.`,
    openGraph: img ? { images: [img] } : undefined,
  };
}

export default async function StubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const stub = await getStub(id);
  if (!stub) notFound();

  stub.mint_status = (await refreshMint(stub)) as Stub["mint_status"];
  const user = await currentUser();
  const mine = user?.id === stub.owner_id;

  return (
    <>
      {isNew && mine && <div className="notice good">Your stub is saved. Share it with whoever was there.</div>}
      <Keepsake stub={stub} />
      <div className="actions">
        <ShareButton title={stub.event_name} />
        {mine ? (
          <Link className="btn secondary" href="/collection">Back to my stubs</Link>
        ) : (
          <Link className="btn secondary" href="/">What’s SwitchTix?</Link>
        )}
      </div>
    </>
  );
}
