import { redirect } from "next/navigation";
import { currentUser, googleEnabled } from "@/lib/supabase";
import LoginForm from "../LoginForm";

export const metadata = { title: "SwitchTix" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/deals";
  if (await currentUser()) redirect(safe);
  const buying = safe.startsWith("/d/");

  return (
    <div className="launch">
      <h1>{buying ? "Your tickets are waiting" : "Safe ticket deals between people"}</h1>
      <p className="muted">
        {buying ? "Sign in to see the deal and pay safely." : "Your money is held until the tickets arrive."}
      </p>
      {error === "link" && <div className="notice bad">That sign-in didn’t finish. Please try again.</div>}
      {error === "google" && <div className="notice bad">Google sign-in isn’t available right now. Use your email instead.</div>}
      <LoginForm next={safe} google={await googleEnabled()} />
      <p className="muted small launch-foot">
        Beta · test mode, no real money moves
        <br />
        <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
      </p>
    </div>
  );
}
