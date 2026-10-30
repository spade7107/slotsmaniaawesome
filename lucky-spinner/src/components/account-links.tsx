"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function AccountLinks() {
  const supabase = getSupabaseClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ userId: string; username: string } | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("Could not read auth session", error.message);
        return;
      }
      setUserId(data.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    let active = true;
    if (!supabase || !userId) return () => { active = false; };

    void supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not load signed-in username", error.message);
          return;
        }
        if (active && data?.username) setProfile({ userId, username: data.username });
      });

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const username = profile?.userId === userId ? profile.username : null;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/leaderboards"
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/85 transition hover:border-[#67d8c6]/60 hover:bg-white/10"
      >
        Leaderboards
      </Link>
      {username ? (
        <>
          <span className="rounded-lg border border-[#67d8c6]/25 bg-[#67d8c6]/5 px-3 py-2.5 text-xs font-semibold text-[#67d8c6]">
            {username}
          </span>
          <button
            type="button"
            onClick={() => {
              void supabase?.auth.signOut().then(({ error }) => {
                if (error) console.error("Could not sign out", error.message);
                else setUserId(null);
              });
            }}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/65 transition hover:bg-white/10"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/85 transition hover:bg-white/10"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-[#f3cc70]/35 bg-[#f3cc70]/10 px-3 py-2.5 text-xs font-semibold text-[#f3cc70] transition hover:bg-[#f3cc70]/20"
          >
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}
