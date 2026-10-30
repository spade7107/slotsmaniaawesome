import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase-admin";

const GUEST_COOKIE_NAME = "slotsmania_guest";
const GUEST_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface GameActor {
  userId: string | null;
  guestSessionId: string | null;
  balance: number;
  balanceVersion: number;
  newGuestCookie: string | null;
}

function guestSecret(): string {
  const secret = process.env.GUEST_SESSION_SECRET;
  if (!secret || (process.env.NODE_ENV === "production" && Buffer.byteLength(secret) < 32)) {
    throw new Error("GUEST_SESSION_SECRET must contain at least 32 bytes");
  }
  return secret;
}

function signGuestId(id: string): string {
  return createHmac("sha256", guestSecret()).update(id).digest("base64url");
}

function verifiedGuestId(value: string | undefined): string | null {
  if (!value) return null;
  const [id, signature, extra] = value.split(".");
  if (!id || !signature || extra || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = Buffer.from(signGuestId(id));
  const supplied = Buffer.from(signature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? id : null;
}

export function setGuestCookie(response: NextResponse, value: string | null): void {
  if (!value) return;
  response.cookies.set(GUEST_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_TTL_SECONDS,
  });
}

async function authenticatedUserId(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error?.name === "AuthSessionMissingError") return null;
  if (error) throw new Error(`Could not verify the signed-in user: ${error.message}`);
  return data.user?.id ?? null;
}

export async function getGameActor(): Promise<GameActor> {
  const userId = await authenticatedUserId();
  const admin = getSupabaseAdmin();

  if (userId) {
    const { error: createError } = await admin
      .from("player_wallets")
      .upsert({ player_id: userId, balance: 1_000, balance_version: 0 }, {
        onConflict: "player_id",
        ignoreDuplicates: true,
      });
    if (createError) throw new Error(`Could not initialize player credits: ${createError.message}`);

    const { data, error } = await admin
      .from("player_wallets")
      .select("balance,balance_version")
      .eq("player_id", userId)
      .single();
    if (error) throw new Error(`Could not load player credits: ${error.message}`);
    return {
      userId,
      guestSessionId: null,
      balance: data.balance,
      balanceVersion: data.balance_version,
      newGuestCookie: null,
    };
  }

  const cookieStore = await cookies();
  let guestSessionId = verifiedGuestId(cookieStore.get(GUEST_COOKIE_NAME)?.value);
  if (guestSessionId) {
    const { data, error } = await admin
      .from("guest_sessions")
      .select("id,balance,expires_at")
      .eq("id", guestSessionId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw new Error(`Could not load guest credits: ${error.message}`);
    if (data) {
      return {
        userId: null,
        guestSessionId: data.id,
        balance: data.balance,
        balanceVersion: 0,
        newGuestCookie: null,
      };
    }
    guestSessionId = null;
  }

  guestSessionId = randomUUID();
  const expiresAt = new Date(Date.now() + GUEST_TTL_SECONDS * 1_000).toISOString();
  const { data, error } = await admin
    .from("guest_sessions")
    .insert({ id: guestSessionId, balance: 1_000, expires_at: expiresAt })
    .select("id,balance")
    .single();
  if (error) throw new Error(`Could not start guest session: ${error.message}`);

  return {
    userId: null,
    guestSessionId: data.id,
    balance: data.balance,
    balanceVersion: 0,
    newGuestCookie: `${data.id}.${signGuestId(data.id)}`,
  };
}
