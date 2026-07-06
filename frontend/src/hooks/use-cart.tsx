import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  image_url?: string | null;
  stock_quantity: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const found = prev.find((p) => p.product_id === item.product_id);
      if (found) {
        return prev.map((p) =>
          p.product_id === item.product_id
            ? { ...p, quantity: Math.min(p.quantity + 1, item.stock_quantity) }
            : p,
        );
      }
      if (item.stock_quantity <= 0) return prev;
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((p) => (p.product_id === id ? { ...p, quantity: Math.max(0, Math.min(qty, p.stock_quantity)) } : p))
        .filter((p) => p.quantity > 0),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.product_id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, clear, subtotal, count }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
