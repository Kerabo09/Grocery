import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { Input } from "@/components/ui/input";
import { money } from "@/hooks/use-cart";
import { Search, AlertTriangle, Package } from "lucide-react";

export function StockPage() {
  const [q, setQ] = useState("");
  useRealtimeInvalidate("products", [["products-stock"]]);

  const query = useQuery({
    queryKey: ["products-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock_quantity, reorder_level, image_url, categories(name)")
        .eq("is_active", true)
        .order("stock_quantity", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => (query.data ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [query.data, q],
  );

  const lowCount = (query.data ?? []).filter((p) => p.stock_quantity <= (p.reorder_level ?? 5)).length;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Stock Check</h1>
          <p className="text-muted-foreground mt-1">Live inventory across the store.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-warning/15 text-warning-foreground font-semibold">
            <AlertTriangle className="w-4 h-4 text-warning" /> {lowCount} low-stock
          </span>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inventory…" className="pl-11 h-11 rounded-full bg-surface-container border-transparent" />
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><Package className="w-4 h-4 text-tertiary" /> Recent Inventory</h2>
          <span className="text-xs text-muted-foreground">{filtered.length} items</span>
        </div>
        <div className="divide-y divide-border/60">
          {query.isLoading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 h-16 animate-pulse bg-surface-container/40" />
          )) : filtered.map((p) => {
            const low = p.stock_quantity <= (p.reorder_level ?? 5);
            const out = p.stock_quantity <= 0;
            return (
              <div key={p.id} className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container overflow-hidden flex-shrink-0">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(p.categories as { name: string } | null)?.name ?? "Uncategorized"} · {money(Number(p.price))}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-lg ${out ? "text-destructive" : low ? "text-warning" : "text-foreground"}`}>{p.stock_quantity}</div>
                  <div className="text-xs text-muted-foreground">in stock</div>
                </div>
                {out ? (
                  <span className="hidden sm:inline text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/15 text-destructive uppercase">Out</span>
                ) : low ? (
                  <span className="hidden sm:inline text-[10px] font-bold px-2 py-1 rounded-full bg-warning/15 text-warning-foreground uppercase">Low</span>
                ) : (
                  <span className="hidden sm:inline text-[10px] font-bold px-2 py-1 rounded-full bg-success/15 text-success uppercase">Ok</span>
                )}
              </div>
            );
          })}
          {!query.isLoading && filtered.length === 0 && (
            <div className="p-10 text-center text-muted-foreground">No products.</div>
          )}
        </div>
      </div>
    </div>
  );
}
