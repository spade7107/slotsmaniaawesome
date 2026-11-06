"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const supabase = getSupabaseClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setError("");
    setMessage("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("This reset link is invalid or has expired. Request a new one and try again.");
      return;
    }
    setMessage("Your password has been updated. You can now sign in with your new password.");
  };

  return (
    <main className="min-h-screen px-4 py-12 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#111827]/90 p-7 shadow-2xl">
        <Link href="/login" className="text-sm text-[#67d8c6] hover:underline">← Back to sign in</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-[#67d8c6]">The green room</p>
        <h1 className="mt-2 text-3xl font-black text-[#fff7e5]">Choose a new password</h1>
        {!supabase ? (
          <p role="alert" className="mt-6 rounded-lg border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            Password reset is not configured yet. Add the public Supabase URL and publishable key to the app environment.
          </p>
        ) : message ? (
          <p role="status" className="mt-6 text-sm text-[#67d8c6]">{message}</p>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-medium text-white/80">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-3 outline-none focus:border-[#67d8c6]"
              />
            </label>
            <label className="block text-sm font-medium text-white/80">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-3 outline-none focus:border-[#67d8c6]"
              />
            </label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#67d8c6] px-4 py-3 font-bold text-[#07151a] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Updating password…" : "Update password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
