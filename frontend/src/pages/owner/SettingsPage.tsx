import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Store, User, Percent } from "lucide-react";

type StoreSettings = { name: string; address: string; taxPct: number; currency: string };

export function SettingsPage() {
  const { profile } = useAuth();
  const [s, setS] = useState<StoreSettings>({ name: "FreshLogic Store", address: "", taxPct: 12, currency: "PHP" });

  useEffect(() => {
    const raw = localStorage.getItem("freshlogic-settings");
    if (raw) try { setS(JSON.parse(raw)); } catch { /* noop */ }
  }, []);

  const save = () => {
    localStorage.setItem("freshlogic-settings", JSON.stringify(s));
    toast.success("Settings saved");
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Settings</h1>
      <p className="text-muted-foreground mt-1">Store & account preferences.</p>

      <section className="rounded-3xl border border-border bg-card p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Store information</h2>
        </div>
        <div className="grid gap-4">
          <div><Label>Store name</Label><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} placeholder="123 Market St." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Default tax %</Label><Input type="number" value={s.taxPct} onChange={(e) => setS({ ...s, taxPct: Number(e.target.value) })} /></div>
            <div><Label>Currency</Label><Input value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} /></div>
          </div>
        </div>
        <div className="mt-6"><Button onClick={save} className="rounded-full">Save changes</Button></div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Your account</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Name</div>
            <div className="font-semibold">{profile?.full_name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Role</div>
            <div className="font-semibold uppercase">{profile?.role}</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Percent className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Real-time sync</h2>
        </div>
        <p className="text-sm text-muted-foreground">Products, sales, and stock movements are streamed live between the register and dashboards. No action needed.</p>
      </section>
    </div>
  );
}
