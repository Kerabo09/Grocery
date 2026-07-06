import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

/** Redirects to /auth when there's no active session. Renders nested routes otherwise. */
export function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
