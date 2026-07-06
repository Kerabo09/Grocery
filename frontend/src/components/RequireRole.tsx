import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import type { Profile } from "@/hooks/use-auth";

type RequireRoleProps = {
  role: Profile["role"];
  redirectTo: string;
};

/** Redirects away when the signed-in profile doesn't have the required role. */
export function RequireRole({ role, redirectTo }: RequireRoleProps) {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  if (profile.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
