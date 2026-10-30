import { NextResponse, type NextRequest } from "next/server";
import { userClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = await userClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
