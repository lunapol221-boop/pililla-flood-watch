import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, Loader2 } from "lucide-react";

function FullscreenLoader() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <Loader2 className="h-6 w-6 text-primary animate-spin" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (!isAdmin) {
    return (
      <div className="glass-panel hud-brackets p-8 max-w-lg mx-auto mt-12 text-center">
        <ShieldAlert className="h-10 w-10 text-risk-high mx-auto" />
        <h2 className="display-font text-xl font-bold mt-3">Restricted · Admin clearance required</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Mission Control is limited to verified operators. Contact a system administrator to be granted the <span className="mono-font text-primary">admin</span> role.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
