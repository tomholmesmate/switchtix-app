import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";

/** The app opens on your deals, or on the sign-in screen if you're signed out. */
export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect("/deals");
  redirect(next ? `/signin?next=${encodeURIComponent(next)}` : "/signin");
}
