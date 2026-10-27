"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (loginError) {
      setError(loginError.message);
      return;
    }
    router.push("/leaderboards");
  };

  return (
    <main className="min-h-screen px-4 py-12 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#111827]/90 p-7 shadow-2xl">
        <Link href="/" className="text-sm text-[#67d8c6] hover:underline">← Back to the games</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-[#67d8c6]">The green room</p>
        <h1 className="mt-2 text-3xl font-black text-[#fff7e5]">Welcome back</h1>
        {!supabase ? (
          <p role="alert" className="mt-6 rounded-lg border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            Sign-in is not configured yet. Add the public Supabase URL and anon key to the app environment.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-medium text-white/80">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-3 outline-none focus:border-[#67d8c6]"
              />
            </label>
            <label className="block text-sm font-medium text-white/80">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-3 outline-none focus:border-[#67d8c6]"
              />
            </label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#67d8c6] px-4 py-3 font-bold text-[#07151a] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-white/60">
          New here? <Link href="/signup" className="font-semibold text-[#67d8c6] hover:underline">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
