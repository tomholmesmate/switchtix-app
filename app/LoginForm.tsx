"use client";

import { useActionState } from "react";
import { sendSignInLink, type LoginState } from "./actions";

export default function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendSignInLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="notice good">
        Check your email for a sign-in link. Open it on this device.
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next ?? ""} />
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      {state.status === "error" && <div className="notice bad">{state.message}</div>}
      <button className="btn block" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
