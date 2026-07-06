import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, BarChart3, Users, Wallet, Settings, ShoppingBasket, LogOut } from "lucide-react";

export function OwnerLayout() {
  const { profile, signOut } = useAuth();
  const path = useLocation().pathname;
  const navigate = useNavigate();

  const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
    { to: "/owner", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/owner/inventory", label: "Inventory", icon: Package },
    { to: "/owner/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/owner/staff", label: "Staff", icon: Users },
    { to: "/owner/expenses", label: "Expenses", icon: Wallet },
    { to: "/owner/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-surface sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <button onClick={() => navigate("/select-role")} className="flex items-center gap-2">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
              <ShoppingBasket className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg">FreshLogic</span>
            <span className="hidden md:inline text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Owner</span>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} className={`px-3 py-2 rounded-full text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-container"}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-sm text-muted-foreground">{profile?.full_name}</span>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 md:mr-1.5" /><span className="hidden md:inline">Sign out</span></Button>
          </div>
        </div>

        <div className="lg:hidden border-t border-border/60 flex overflow-x-auto">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to} className={`flex-shrink-0 px-4 py-3 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${active ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
                <Icon className="w-4 h-4" /> {n.label}
              </Link>
            );
          })}
        </div>
      </header>

      <Outlet />
    </div>
  );
}
