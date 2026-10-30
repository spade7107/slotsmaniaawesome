import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const MAX_REQUEST_SIZE = 16_384;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_FORMAT = /^[A-Za-z0-9_]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  if (!isRecord(body)) {
    return badRequest("Request body must be a JSON object.");
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email.length > 254 || !EMAIL_FORMAT.test(email)) {
    return badRequest("Enter a valid email address.");
  }
  if (username.length < 3 || username.length > 20 || !USERNAME_FORMAT.test(username)) {
    return badRequest("Use a username with 3–20 letters, numbers, or underscores.");
  }
  if (password.length < 8 || password.length > 128) {
    return badRequest("Password must be between 8 and 128 characters.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  if (!supabaseUrl || !publishableKey) {
    console.error("Sign-up is unavailable because Supabase is not configured.");
    return NextResponse.json({ error: "Sign-up is temporarily unavailable. Please try again later." }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      if (error.status === 400) {
        return badRequest("Could not create an account with those details.");
      }
      console.error("Supabase account creation failed", error.status, error.code);
      return NextResponse.json({ error: "Could not create your account. Please try again later." }, { status: 500 });
    }

    return NextResponse.json({
      message: "Account created. Check your email to confirm your address, then sign in.",
    }, { status: 201 });
  } catch (error) {
    console.error(
      "Sign-up request failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Could not create your account. Please try again later." }, { status: 500 });
  }
}
