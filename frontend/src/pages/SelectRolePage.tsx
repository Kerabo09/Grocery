import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingCart, LogOut, ShoppingBasket } from "lucide-react";

export function SelectRolePage() {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Cashier accounts skip the picker entirely
    if (!loading && profile && profile.role === "cashier") {
      navigate("/cashier", { replace: true });
    }
  }, [profile, loading, navigate]);

  if (loading || !profile) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
              <ShoppingBasket className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg">FreshLogic</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{profile.full_name}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center">Choose your portal</h1>
        <p className="text-center text-muted-foreground mt-3">Signed in as <span className="font-semibold text-foreground">{profile.full_name}</span></p>

        <div className="mt-14 grid md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate("/owner")}
            className="group text-left rounded-3xl border border-border bg-card p-8 hover:border-primary hover:shadow-lg transition"
          >
            <div className="grid place-items-center w-16 h-16 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
              <LayoutDashboard className="w-8 h-8" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Admin Portal</h2>
            <p className="mt-2 text-muted-foreground">Dashboard, inventory, sales analytics, staff & expenses.</p>
            <div className="mt-6 text-primary font-semibold group-hover:translate-x-1 transition">Enter admin →</div>
          </button>

          <button
            onClick={() => navigate("/cashier")}
            className="group text-left rounded-3xl border border-border bg-card p-8 hover:border-tertiary hover:shadow-lg transition"
          >
            <div className="grid place-items-center w-16 h-16 rounded-2xl bg-tertiary/15 text-tertiary group-hover:bg-tertiary group-hover:text-tertiary-foreground transition">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Cashier Portal</h2>
            <p className="mt-2 text-muted-foreground">Ring up sales, check live stock, and view your shift history.</p>
            <div className="mt-6 text-tertiary font-semibold group-hover:translate-x-1 transition">Open register →</div>
          </button>
        </div>
      </main>
    </div>
  );
}
