"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountLinks } from "@/components/account-links";
import { useGameSession } from "@/hooks/use-game-session";

export default function HomePage() {
  const { balance, ready, error } = useGameSession();

  return (
    <main className="min-h-screen w-full max-w-7xl px-4 py-6 text-white sm:px-8 sm:py-8 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <Link href="/" className="text-lg font-black tracking-[0.12em] text-[#fff7e5]">
          SLOTS <span className="text-[#67d8c6]">MANIA</span>
        </Link>
        <AccountLinks />
      </header>

      <div className="mx-auto grid w-full max-w-5xl content-center gap-10 py-12 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-16">
        <section className="text-center lg:text-left">
          <Image
            src="/legacy-assets/logo4.png"
            alt="Gambling Mania"
            width={1200}
            height={500}
            unoptimized
            priority
            className="mx-auto mb-6 h-auto w-full max-w-md object-contain lg:mx-0"
          />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#67d8c6]">
            Your games room is ready
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[#fff7e5] sm:text-5xl">
            Play for fun. <span className="text-[#67d8c6]">Play your way.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60 lg:mx-0">
            Take a seat at the tables, spin the wheels, and see how high you can climb.
          </p>
          <Link
            href="/games"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#67d8c6] px-7 py-3 font-bold text-[#07151a] shadow-[0_12px_32px_rgba(31,185,164,0.2)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Explore the games <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section
          aria-labelledby="balance-heading"
          className="rounded-2xl border border-white/10 bg-[#111827]/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#67d8c6]">
            Your account
          </p>
          <h2 id="balance-heading" className="mt-2 text-xl font-bold text-[#fff7e5]">
            Play balance
          </h2>
          <p className="mt-5 font-mono text-4xl font-black tabular-nums text-[#f3cc70]">
            {ready ? balance.toLocaleString("en-US") : "…"}
          </p>
          <p className="mt-1 text-sm text-white/50">credits</p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              Could not load your balance: {error}
            </p>
          )}
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-sm leading-relaxed text-white/60">
              Sign in to keep your username visible and compete on the leaderboards.
            </p>
            <Link
              href="/leaderboards"
              className="mt-4 inline-flex text-sm font-semibold text-[#67d8c6] transition hover:text-white"
            >
              View the leaderboards <span className="ml-1" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
