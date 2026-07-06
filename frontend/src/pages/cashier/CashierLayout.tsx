import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CartProvider, useCart } from "@/hooks/use-cart";
import { ShoppingBasket, LogOut, ShoppingCart, Package, ClipboardList } from "lucide-react";

export function CashierLayout() {
  return (
    <CartProvider>
      <Shell />
    </CartProvider>
  );
}

function Shell() {
  const { profile, signOut } = useAuth();
  const { count } = useCart();
  const path = useLocation().pathname;
  const navigate = useNavigate();

  const tabs: { to: string; label: string; icon: typeof ShoppingCart; exact?: boolean }[] = [
    { to: "/cashier", label: "Register", icon: ShoppingCart, exact: true },
    { to: "/cashier/stock", label: "Inventory", icon: Package },
    { to: "/cashier/history", label: "History", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-surface sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/select-role")} className="flex items-center gap-2">
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-tertiary text-tertiary-foreground">
                <ShoppingBasket className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg">FreshLogic</span>
              <span className="hidden md:inline text-xs px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-semibold">Cashier</span>
            </button>
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((t) => {
                const active = t.exact ? path === t.to : path.startsWith(t.to);
                return (
                  <Link key={t.to} to={t.to} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${active ? "bg-tertiary text-tertiary-foreground" : "text-muted-foreground hover:bg-surface-container"}`}>
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {count > 0 && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-tertiary">
                <ShoppingCart className="w-4 h-4" /> {count} items
              </span>
            )}
            <span className="text-sm text-muted-foreground hidden lg:block">{profile?.full_name}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Sign out</span>
            </Button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden border-t border-border/60 flex">
          {tabs.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to} className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-semibold ${active ? "text-tertiary" : "text-muted-foreground"}`}>
                <Icon className="w-4 h-4" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </header>

      <Outlet />
    </div>
  );
}
