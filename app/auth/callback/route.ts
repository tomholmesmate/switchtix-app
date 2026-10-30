import { NextResponse, type NextRequest } from "next/server";
import { userClient } from "@/lib/supabase";

/** Where Google (and any email link) sends people back after signing in. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/deals";

  if (code) {
    const supabase = await userClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${dest}`);
  }
  return NextResponse.redirect(`${origin}/signin?error=link&next=${encodeURIComponent(dest)}`);
}
