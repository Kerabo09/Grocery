import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createStaffAccount } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";

export function StaffPage() {
  const qc = useQueryClient();
  useRealtimeInvalidate("profiles", [["staff"]]);

  const q = useQuery({
    queryKey: ["staff"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, role, created_at").order("created_at")).data ?? [],
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "owner" | "cashier" }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["staff"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "cashier" as "owner" | "cashier" });

  const addStaff = useMutation({
    mutationFn: async () => createStaffAccount(form),
    onSuccess: () => {
      toast.success("Account created");
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", role: "cashier" });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create account"),
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Staff</h1>
          <p className="text-muted-foreground mt-1">Manage owner and cashier accounts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><UserPlus className="w-4 h-4 mr-1.5" /> New account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create staff account</DialogTitle>
              <DialogDescription>Add a new cashier or owner. They can sign in with the email and password below.</DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={(e) => { e.preventDefault(); addStaff.mutate(); }}
            >
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" type="text" minLength={6} required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as "owner" | "cashier" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addStaff.isPending}>{addStaff.isPending ? "Creating…" : "Create account"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden mt-6">
        <div className="divide-y divide-border/60">
          {(q.data ?? []).map((s) => (
            <div key={s.id} className="p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-primary/15 grid place-items-center text-primary font-bold">
                {s.full_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{s.full_name}</div>
                <div className="text-xs text-muted-foreground">Joined {s.created_at && new Date(s.created_at).toLocaleDateString()}</div>
              </div>
              <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${s.role === "owner" ? "bg-primary/15 text-primary" : "bg-tertiary/15 text-tertiary"}`}>
                {s.role}
              </span>
              <Button size="sm" variant="outline" onClick={() => setRole.mutate({ id: s.id, role: s.role === "owner" ? "cashier" : "owner" })} disabled={setRole.isPending}>
                Make {s.role === "owner" ? "cashier" : "owner"}
              </Button>
            </div>
          ))}
          {(q.data ?? []).length === 0 && <div className="p-10 text-center text-muted-foreground">No staff yet.</div>}
        </div>
      </div>
    </div>
  );
}
