import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { money } from "@/hooks/use-cart";
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";

export function OwnerDashboard() {
  useRealtimeInvalidate("sales", [["dash-sales"]]);
  useRealtimeInvalidate("products", [["dash-products"]]);

  const salesQ = useQuery({
    queryKey: ["dash-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, total, payment_method, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const prodQ = useQuery({
    queryKey: ["dash-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, stock_quantity, reorder_level, image_url");
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toDateString();
  const todaySales = (salesQ.data ?? []).filter((s) => new Date(s.created_at ?? 0).toDateString() === today);
  const revenue = todaySales.reduce((s, r) => s + Number(r.total), 0);
  const avg = todaySales.length > 0 ? revenue / todaySales.length : 0;
  const lowStock = (prodQ.data ?? []).filter((p) => p.stock_quantity <= (p.reorder_level ?? 5));

  const kpis = [
    { label: "Today's Revenue", value: money(revenue), icon: DollarSign, color: "text-primary bg-primary/10" },
    { label: "Sales Today", value: todaySales.length.toString(), icon: ShoppingCart, color: "text-tertiary bg-tertiary/15" },
    { label: "Avg. Ticket", value: money(avg), icon: TrendingUp, color: "text-success bg-success/15" },
    { label: "Low Stock", value: lowStock.length.toString(), icon: AlertTriangle, color: "text-warning bg-warning/15" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground mt-1">Live snapshot of your store — updates in real time.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-3xl border border-border bg-card p-5">
            <div className={`w-11 h-11 rounded-2xl grid place-items-center ${k.color}`}>
              <k.icon className="w-5 h-5" />
            </div>
            <div className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="text-2xl md:text-3xl font-extrabold mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border/60 font-bold">Recent Sales</div>
          <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {(salesQ.data ?? []).slice(0, 10).map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{(s.profiles as { full_name: string } | null)?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground uppercase">{s.payment_method} · {s.created_at && new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="font-bold text-primary">{money(Number(s.total))}</div>
              </div>
            ))}
            {(salesQ.data ?? []).length === 0 && <div className="p-8 text-center text-muted-foreground">No sales yet.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border/60 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Low Stock Alerts
          </div>
          <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {lowStock.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">All stocked up!</div>
            ) : lowStock.map((p) => (
              <div key={p.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container overflow-hidden flex-shrink-0">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Reorder at {p.reorder_level}</div>
                </div>
                <div className="font-bold text-warning">{p.stock_quantity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
