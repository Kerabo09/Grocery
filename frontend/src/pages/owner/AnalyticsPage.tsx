import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { money } from "@/hooks/use-cart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["oklch(0.52 0.14 155)", "oklch(0.62 0.15 45)", "oklch(0.62 0.15 260)", "oklch(0.78 0.15 80)"];

export function AnalyticsPage() {
  useRealtimeInvalidate("sales", [["analytics-sales"]]);

  const q = useQuery({
    queryKey: ["analytics-sales"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data } = await supabase.from("sales")
        .select("total, payment_method, created_at, sale_items(product_id, quantity, line_total, products(name))")
        .gte("created_at", since.toISOString())
        .order("created_at");
      return data ?? [];
    },
  });

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    (q.data ?? []).forEach((s) => {
      const k = (s.created_at ?? "").slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + Number(s.total));
    });
    return Array.from(map, ([date, revenue]) => ({ date: date.slice(5), revenue }));
  }, [q.data]);

  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    (q.data ?? []).forEach((s) => map.set(s.payment_method ?? "other", (map.get(s.payment_method ?? "other") ?? 0) + Number(s.total)));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [q.data]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; rev: number }>();
    (q.data ?? []).forEach((s) => {
      (s.sale_items as { product_id: string; quantity: number; line_total: number; products: { name: string } | null }[] | null)?.forEach((li) => {
        const name = li.products?.name ?? "Unknown";
        const cur = map.get(li.product_id) ?? { name, qty: 0, rev: 0 };
        cur.qty += li.quantity; cur.rev += Number(li.line_total);
        map.set(li.product_id, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.rev - a.rev).slice(0, 8);
  }, [q.data]);

  const totalRev = (q.data ?? []).reduce((s, r) => s + Number(r.total), 0);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Analytics</h1>
      <p className="text-muted-foreground mt-1">Last 30 days of sales.</p>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-xs uppercase text-muted-foreground">30-day Revenue</div>
          <div className="text-3xl font-extrabold text-primary mt-1">{money(totalRev)}</div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-xs uppercase text-muted-foreground">Transactions</div>
          <div className="text-3xl font-extrabold mt-1">{q.data?.length ?? 0}</div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-xs uppercase text-muted-foreground">Avg. Ticket</div>
          <div className="text-3xl font-extrabold mt-1">{money((q.data?.length ?? 0) > 0 ? totalRev / (q.data!.length) : 0)}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-bold mb-4">Revenue trend</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={byDay}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.52 0.14 155)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-bold mb-4">By payment</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card mt-4 overflow-hidden">
        <div className="p-5 border-b border-border/60 font-bold">Top products</div>
        <div className="divide-y divide-border/60">
          {topProducts.map((p, i) => (
            <div key={p.name + i} className="p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 grid place-items-center text-primary font-bold text-sm">{i + 1}</div>
              <div className="flex-1 font-semibold">{p.name}</div>
              <div className="text-muted-foreground text-sm">{p.qty} sold</div>
              <div className="font-bold text-primary w-28 text-right">{money(p.rev)}</div>
            </div>
          ))}
          {topProducts.length === 0 && <div className="p-10 text-center text-muted-foreground">No sales yet.</div>}
        </div>
      </div>
    </div>
  );
}
