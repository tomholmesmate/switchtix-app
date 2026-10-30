import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import LoginForm from "./LoginForm";

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const user = await currentUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/collection");

  return (
    <>
      <section className="hero">
        <h1>
          Safe deals.<br />
          <em>Forever stubs.</em>
        </h1>
        <p className="muted">
          Turn the tickets from nights you’ll never forget into keepsakes you actually own, and trade tickets with
          friends without the Venmo-and-pray.
        </p>
      </section>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Sign in</h2>
        <p className="muted small">SwitchTix is invite-only right now. Use the email you were invited with.</p>
        {error && <div className="notice bad">That sign-in link didn’t work or has expired. Try again.</div>}
        <LoginForm next={next} />
      </div>
    </>
  );
}
