import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import LoginForm from "../LoginForm";

export const metadata = { title: "Sign in · SwitchTix" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/deals";
  if (await currentUser()) redirect(safe);
  const buying = safe.startsWith("/d/");

  return (
    <div className="signin">
      <h1>{buying ? "Sign in to see your deal" : "Sign in to SwitchTix"}</h1>
      <p className="muted">
        {buying
          ? "Someone sent you tickets through SwitchTix. Sign in or create your account in a few seconds, then pay safely."
          : "Your SwitchTix account keeps your deals, payments and payouts in one place."}
      </p>
      {error === "link" && <div className="notice bad">That sign-in didn’t finish. Please try again.</div>}
      {error === "google" && <div className="notice bad">Google sign-in isn’t available right now. Use your email instead.</div>}
      <div className="panel">
        <LoginForm next={safe} google={process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "on"} />
      </div>
    </div>
  );
}
