"use client";

import { useActionState } from "react";
import { signIn, signInWithGoogle, type LoginState } from "./actions";

export default function LoginForm({ next, google }: { next?: string; google: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { status: "idle" });

  return (
    <div className="signin-stack">
      {google && (
        <>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next ?? ""} />
            <button className="btn google block" type="submit">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 2.9-2.2 5.4-4.7 7l7.3 5.7c4.3-4 7.2-9.9 7.2-17.2z" />
                <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.8-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
              </svg>
              Continue with Google
            </button>
          </form>
          <div className="or"><span>or use your email</span></div>
        </>
      )}

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
          New here? Just pick a password. It becomes yours.
        </p>
        {state.status === "error" && <div className="notice bad">{state.message}</div>}
        <button className="btn block" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
