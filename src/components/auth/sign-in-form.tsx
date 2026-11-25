"use client";

import { useState, type FormEvent } from "react";

export function SignInForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (response.ok) {
        window.location.replace("/");
        return;
      }
      setError(response.status === 400 || response.status === 401
        ? "Check your email and password and try again."
        : "Sign-in is unavailable. Try again later.");
    } catch {
      setError("Sign-in is unavailable. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form method="post" className="mt-6 space-y-4" onSubmit={signIn}>
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="username" required
          className="mt-1 block w-full rounded-md border border-slate-300 p-2" />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input name="password" type="password" autoComplete="current-password" required
          className="mt-1 block w-full rounded-md border border-slate-300 p-2" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
