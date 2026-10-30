"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { status: "idle" });

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next ?? ""} />
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={6}
        placeholder="At least 6 characters"
      />
      <p className="muted small" style={{ margin: "8px 0 0" }}>
        First time here? Just pick a password. It becomes yours.
      </p>
      {state.status === "error" && <div className="notice bad">{state.message}</div>}
      <button className="btn block" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
