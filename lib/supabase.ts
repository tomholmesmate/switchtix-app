import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Supabase client that acts as the signed-in user (respects row-level security). */
export async function userClient() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
}

/** Admin client for trusted server-side work only. Never import into client components. */
export function adminClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The signed-in user, or null. */
export async function currentUser() {
  const supabase = await userClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function siteUrl() {
  // NEXT_PUBLIC_SITE_URL wins if set; otherwise use the production address Vercel provides automatically.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const fallback = vercel ? `https://${vercel}` : "http://localhost:3000";
  return (process.env.NEXT_PUBLIC_SITE_URL || fallback).replace(/\/$/, "");
}

export function stubImageUrl(path: string | null) {
  if (!path) return null;
  return `${url}/storage/v1/object/public/stubs/${path}`;
}
