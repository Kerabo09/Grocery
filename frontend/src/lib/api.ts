import { supabase } from "@/integrations/supabase/client";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

class ApiError extends Error {}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Thin fetch wrapper that attaches the Supabase bearer token and unwraps JSON/errors. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request failed with status ${res.status}`);
  }

  return body as T;
}

export type CreateStaffInput = {
  email: string;
  password: string;
  full_name: string;
  role: "owner" | "cashier";
};

/** Calls the backend endpoint that creates a staff account with the Supabase service role. */
export function createStaffAccount(input: CreateStaffInput) {
  return apiFetch<{ id: string }>("/api/staff", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
