import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { money } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, PackagePlus, Trash2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  cost: number | null;
  stock_quantity: number;
  reorder_level: number | null;
  image_url: string | null;
  is_active: boolean;
};

export function InventoryPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  useRealtimeInvalidate("products", [["own-products"]]);

  const cats = useQuery({
    queryKey: ["cats"],
    queryFn: async () => (await supabase.from("categories").select("id, name").order("name")).data ?? [],
  });

  const products = useQuery({
    queryKey: ["own-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, categories(name)").order("name");
      return (data ?? []) as (Product & { categories: { name: string } | null })[];
    },
  });

  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [restockFor, setRestockFor] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(0);

  const save = useMutation({
    mutationFn: async (p: Partial<Product>) => {
      if (p.id) {
        const { error } = await supabase.from("products").update({
          name: p.name!, category_id: p.category_id, price: p.price!, cost: p.cost,
          stock_quantity: p.stock_quantity!, reorder_level: p.reorder_level, image_url: p.image_url,
        }).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({
          name: p.name!, category_id: p.category_id, price: p.price!, cost: p.cost,
          stock_quantity: p.stock_quantity ?? 0, reorder_level: p.reorder_level ?? 5, image_url: p.image_url,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["own-products"] }); setEditing(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["own-products"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const restock = useMutation({
    mutationFn: async () => {
      if (!restockFor || restockQty <= 0 || !profile) return;
      const { error } = await supabase.from("products").update({
        stock_quantity: restockFor.stock_quantity + restockQty,
      }).eq("id", restockFor.id);
      if (error) throw error;
      await supabase.from("stock_logs").insert({
        product_id: restockFor.id, change_qty: restockQty, reason: "restock", changed_by: profile.id,
      });
    },
    onSuccess: () => { toast.success("Stock updated"); qc.invalidateQueries({ queryKey: ["own-products"] }); setRestockFor(null); setRestockQty(0); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Restock failed"),
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage products, prices, and stock.</p>
        </div>
        <Button onClick={() => setEditing({ price: 0, stock_quantity: 0, reorder_level: 5 })} className="rounded-full">
          <Plus className="w-4 h-4 mr-1.5" /> Add product
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4 hidden md:table-cell">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4 hidden lg:table-cell">Cost</th>
                <th className="p-4">Stock</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(products.data ?? []).map((p) => {
                const low = p.stock_quantity <= (p.reorder_level ?? 5);
                return (
                  <tr key={p.id}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-container overflow-hidden flex-shrink-0">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : null}
                        </div>
                        <span className="font-semibold">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell text-muted-foreground">{p.categories?.name ?? "—"}</td>
                    <td className="p-4 font-semibold">{money(Number(p.price))}</td>
                    <td className="p-4 hidden lg:table-cell text-muted-foreground">{p.cost ? money(Number(p.cost)) : "—"}</td>
                    <td className="p-4">
                      <span className={`font-bold ${low ? "text-warning" : ""}`}>{p.stock_quantity}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setRestockFor(p)}><PackagePlus className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete ${p.name}?`) && del.mutate(p.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(products.data ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No products yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Category</Label>
                <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{(cats.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div><Label>Cost</Label><Input type="number" value={editing.cost ?? ""} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Stock</Label><Input type="number" value={editing.stock_quantity ?? 0} onChange={(e) => setEditing({ ...editing, stock_quantity: Number(e.target.value) })} /></div>
                <div><Label>Reorder level</Label><Input type="number" value={editing.reorder_level ?? 5} onChange={(e) => setEditing({ ...editing, reorder_level: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Image URL</Label><Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://…" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending || !editing?.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock dialog */}
      <Dialog open={!!restockFor} onOpenChange={(v) => !v && setRestockFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Restock {restockFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Current stock: <b>{restockFor?.stock_quantity}</b></div>
            <Label>Add quantity</Label>
            <Input type="number" min={1} value={restockQty} onChange={(e) => setRestockQty(Number(e.target.value))} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestockFor(null)}>Cancel</Button>
            <Button onClick={() => restock.mutate()} disabled={restock.isPending || restockQty <= 0}>Add stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
