"use client";

import { useState } from "react";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        window.location.replace("/login");
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" disabled={busy} onClick={() => void signOut()} className="underline">
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && <span role="alert">Could not sign out. Try again.</span>}
    </>
  );
}
