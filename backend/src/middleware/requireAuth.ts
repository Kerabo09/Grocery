import type { NextFunction, Request, Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export type AuthedRequest = Request & {
  supabase: SupabaseClient<Database>;
  userId: string;
};

/**
 * Verifies the caller's Supabase bearer token and attaches a request-scoped
 * Supabase client (acting as that user, subject to RLS) plus their userId.
 * Equivalent to the TanStack `requireSupabaseAuth` server middleware.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No authorization header provided" });
    if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Only Bearer tokens are supported" });

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.split(".").length !== 3) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return res.status(401).json({ error: "Invalid token" });
    }

    (req as AuthedRequest).supabase = supabase;
    (req as AuthedRequest).userId = data.claims.sub;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Auth check failed" });
  }
}
