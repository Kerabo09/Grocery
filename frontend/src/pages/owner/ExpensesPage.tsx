import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { money } from "@/hooks/use-cart";
import { Trash2 } from "lucide-react";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";

export function ExpensesPage() {
  const qc = useQueryClient();
  useRealtimeInvalidate("expenses", [["expenses"]]);
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState<number>(0);

  const q = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({ description: desc, amount: amt });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Added"); setDesc(""); setAmt(0); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const total = (q.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Expenses</h1>
      <p className="text-muted-foreground mt-1">Track store operating costs.</p>

      <div className="rounded-3xl border border-border bg-card p-5 mt-6">
        <div className="text-xs uppercase text-muted-foreground">Total expenses</div>
        <div className="text-3xl font-extrabold text-destructive mt-1">{money(total)}</div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 mt-4">
        <h2 className="font-bold mb-3">Add expense</h2>
        <div className="grid md:grid-cols-[1fr_180px_auto] gap-3">
          <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Utilities…" /></div>
          <div><Label>Amount</Label><Input type="number" min={0} value={amt} onChange={(e) => setAmt(Number(e.target.value))} /></div>
          <div className="flex items-end"><Button onClick={() => add.mutate()} disabled={!desc || amt <= 0 || add.isPending} className="w-full">Add</Button></div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden mt-4">
        <div className="divide-y divide-border/60">
          {(q.data ?? []).map((e) => (
            <div key={e.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{e.description ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{e.created_at && new Date(e.created_at).toLocaleString()}</div>
              </div>
              <div className="font-bold text-destructive">{money(Number(e.amount))}</div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del.mutate(e.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {(q.data ?? []).length === 0 && <div className="p-10 text-center text-muted-foreground">No expenses yet.</div>}
        </div>
      </div>
    </div>
  );
}
