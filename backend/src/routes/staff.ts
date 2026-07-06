import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { getSupabaseAdmin } from "../supabase/adminClient";

const CreateStaffInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(["owner", "cashier"]),
});

export const staffRouter = Router();

// POST /api/staff — create a new owner/cashier account.
// Equivalent to the original `createStaffAccount` TanStack Start server function.
staffRouter.post("/", requireAuth, async (req, res) => {
  const parsed = CreateStaffInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const data = parsed.data;
  const { supabase, userId } = req as AuthedRequest;

  try {
    // Ensure caller is an owner
    const { data: caller, error: callerErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (callerErr) throw new Error(callerErr.message);
    if (caller?.role !== "owner") {
      return res.status(403).json({ error: "Only owners can create staff accounts" });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) {
      return res.status(400).json({ error: error?.message ?? "Failed to create user" });
    }

    // Trigger inserts profile as 'cashier' by default; enforce requested role.
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name, role: data.role })
      .eq("id", created.user.id);
    if (upErr) throw new Error(upErr.message);

    res.json({ id: created.user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to create staff account" });
  }
});
