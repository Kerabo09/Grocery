import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { money } from "@/hooks/use-cart";
import { Receipt } from "lucide-react";

export function HistoryPage() {
  const { profile } = useAuth();
  useRealtimeInvalidate("sales", [["my-sales"]]);

  const q = useQuery({
    enabled: !!profile,
    queryKey: ["my-sales", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, total, subtotal, tax, discount, payment_method, created_at, sale_items(quantity)")
        .eq("cashier_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const todayTotal = (q.data ?? [])
    .filter((s) => new Date(s.created_at ?? 0).toDateString() === new Date().toDateString())
    .reduce((s, r) => s + Number(r.total), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold tracking-tight">My Sales</h1>
      <p className="text-muted-foreground mt-1">Everything you rang up.</p>

      <div className="grid grid-cols-2 gap-3 my-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Today's revenue</div>
          <div className="text-2xl font-extrabold mt-1 text-primary">{money(todayTotal)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Sales this shift</div>
          <div className="text-2xl font-extrabold mt-1">{q.data?.filter((s) => new Date(s.created_at ?? 0).toDateString() === new Date().toDateString()).length ?? 0}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border/60 font-bold flex items-center gap-2">
          <Receipt className="w-4 h-4 text-tertiary" /> Recent sales
        </div>
        <div className="divide-y divide-border/60">
          {q.isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-surface-container/40" />) :
            (q.data ?? []).map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-tertiary/15 grid place-items-center text-tertiary font-bold">
                  {(s.sale_items as { quantity: number }[])?.reduce((a, b) => a + b.quantity, 0) ?? 0}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">Sale #{s.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.created_at && new Date(s.created_at).toLocaleString()} · <span className="uppercase">{s.payment_method}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{money(Number(s.total))}</div>
                </div>
              </div>
            ))}
          {!q.isLoading && (q.data ?? []).length === 0 && (
            <div className="p-10 text-center text-muted-foreground">No sales yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
