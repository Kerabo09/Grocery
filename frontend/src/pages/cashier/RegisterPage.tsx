import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart, money } from "@/hooks/use-cart";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, Receipt, X } from "lucide-react";

type Product = {
  id: string; name: string; price: number; stock_quantity: number;
  image_url: string | null; category_id: string | null; is_active: boolean;
};
type Category = { id: string; name: string };

export function RegisterPage() {
  const { profile } = useAuth();
  const { items, add, setQty, remove, clear, subtotal, count } = useCart();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [discount, setDiscount] = useState<number>(0);
  const [taxPct, setTaxPct] = useState<number>(12);
  const [method, setMethod] = useState<"cash" | "card" | "gcash" | "other">("cash");
  const [busy, setBusy] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  useRealtimeInvalidate("products", [["products"]]);

  const catsQ = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const prodQ = useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock_quantity, image_url, category_id, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const filtered = useMemo(() => {
    const list = prodQ.data ?? [];
    return list.filter((p) => {
      if (catFilter !== "all" && p.category_id !== catFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [prodQ.data, search, catFilter]);

  const tax = (subtotal * taxPct) / 100;
  const total = Math.max(0, subtotal + tax - discount);

  const checkout = async () => {
    if (!profile || items.length === 0) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("process_sale", {
        cashier: profile.id,
        cart: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })) as never,
        tax_amount: tax,
        discount_amount: discount,
        method,
      });
      if (error) throw error;
      setReceiptId(data as string);
      clear();
      setDiscount(0);
      toast.success("Sale complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sale failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 grid lg:grid-cols-[1fr_400px] gap-6">
      {/* Products */}
      <section>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="pl-11 h-11 rounded-full bg-surface-container border-transparent" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-11 rounded-full bg-surface-container border-transparent w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {catsQ.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {prodQ.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] rounded-2xl bg-surface-container animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => {
              const out = p.stock_quantity <= 0;
              const low = !out && p.stock_quantity <= 5;
              return (
                <button
                  key={p.id}
                  disabled={out}
                  onClick={() => add({ product_id: p.id, name: p.name, unit_price: Number(p.price), stock_quantity: p.stock_quantity, image_url: p.image_url })}
                  className="text-left rounded-2xl border border-border bg-card overflow-hidden hover:border-tertiary hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="aspect-square bg-surface-container relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground text-3xl font-bold">{p.name[0]}</div>
                    )}
                    {out && <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full bg-destructive text-destructive-foreground uppercase">Out</span>}
                    {low && <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full bg-warning text-warning-foreground uppercase">Low</span>}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-primary font-bold">{money(Number(p.price))}</span>
                      <span className="text-xs text-muted-foreground">{p.stock_quantity} left</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-16">No products match.</div>}
          </div>
        )}
      </section>

      {/* Cart */}
      <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] flex flex-col rounded-3xl border border-border bg-card">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <h2 className="font-bold text-lg">Current sale</h2>
          {items.length > 0 && <Button variant="ghost" size="sm" onClick={clear}><X className="w-4 h-4 mr-1" />Clear</Button>}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-50" />
              Tap a product to start
            </div>
          ) : items.map((i) => (
            <div key={i.product_id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-surface-container overflow-hidden flex-shrink-0">
                {i.image_url ? <img src={i.image_url} alt="" className="w-full h-full object-cover" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{i.name}</div>
                <div className="text-xs text-muted-foreground">{money(i.unit_price)}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => setQty(i.product_id, i.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                <span className="w-7 text-center text-sm font-semibold">{i.quantity}</span>
                <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => setQty(i.product_id, i.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(i.product_id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-border/60 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tax %</Label>
              <Input type="number" min={0} value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value) || 0)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Discount</Label>
              <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({count})</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{money(tax)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>−{money(discount)}</span></div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t"><span>Total</span><span className="text-primary">{money(total)}</span></div>
          </div>
          <Button className="w-full h-12 rounded-full text-base font-bold bg-tertiary text-tertiary-foreground hover:opacity-90" disabled={items.length === 0 || busy} onClick={checkout}>
            {busy ? "Processing…" : "Complete sale"}
          </Button>
        </div>
      </aside>

      <ReceiptModal saleId={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  );
}

function ReceiptModal({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const q = useQuery({
    enabled: !!saleId,
    queryKey: ["sale", saleId],
    queryFn: async () => {
      const { data: sale } = await supabase.from("sales").select("*").eq("id", saleId!).single();
      const { data: lines } = await supabase.from("sale_items").select("*, products(name)").eq("sale_id", saleId!);
      return { sale, lines: lines ?? [] };
    },
  });

  return (
    <Dialog open={!!saleId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
        {!q.data ? <div className="py-8 text-center text-muted-foreground">Loading…</div> : (
          <div className="space-y-3 text-sm">
            <div className="text-center py-2">
              <div className="font-bold text-lg">FreshLogic</div>
              <div className="text-xs text-muted-foreground">Sale #{q.data.sale?.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{q.data.sale?.created_at && new Date(q.data.sale.created_at).toLocaleString()}</div>
            </div>
            <div className="border-y py-3 space-y-1.5">
              {q.data.lines.map((l) => (
                <div key={l.id} className="flex justify-between">
                  <span>{(l.products as { name: string } | null)?.name} × {l.quantity}</span>
                  <span>{money(Number(l.line_total))}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(Number(q.data.sale?.subtotal ?? 0))}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{money(Number(q.data.sale?.tax ?? 0))}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>−{money(Number(q.data.sale?.discount ?? 0))}</span></div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t"><span>Total</span><span>{money(Number(q.data.sale?.total ?? 0))}</span></div>
              <div className="text-xs text-center text-muted-foreground pt-2 uppercase">Paid by {q.data.sale?.payment_method}</div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="w-full rounded-full">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
