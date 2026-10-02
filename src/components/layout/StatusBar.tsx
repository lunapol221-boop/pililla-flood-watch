import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Satellite, Activity, LogIn, LogOut, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onMenuToggle: () => void;
  navOpen: boolean;
}

export default function StatusBar({ onMenuToggle, navOpen }: Props) {
  const [now, setNow] = useState(new Date());
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utc = now.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const local = now.toLocaleTimeString("en-PH", { hour12: false }) + " PHT";

  return (
    <header className="sticky top-0 z-50 border-b border-primary/20 bg-surface-0/85 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-primary hover:bg-primary/10"
          onClick={onMenuToggle}
          aria-label={navOpen ? "Close menu" : "Open menu"}
        >
          {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded grid place-items-center bg-primary/15 border border-primary/40 shadow-glow">
            <Satellite className="h-4 w-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success))] animate-flicker" />
          </div>
          <div className="leading-tight">
            <div className="display-font text-[15px] sm:text-base font-bold text-primary text-glow tracking-wider">
              FLOOD-OPS · PILILLA
            </div>
            <div className="mono-label hidden sm:block">MISSION CONTROL · REAL-TIME FLOOD DETECTION & EVAC OPTIMIZATION</div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden lg:flex items-center gap-5 text-xs mono-font">
          <Telemetry label="MISSION TIME" value={utc} />
          <Telemetry label="LOCAL" value={local} />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-success/40 bg-success/10">
            <Activity className="h-3 w-3 text-success" />
            <span className="text-success font-semibold">SYSTEMS NOMINAL</span>
          </div>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2 ml-2">
          {user ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded border border-primary/30 bg-primary/10 text-xs">
                {isAdmin ? <Shield className="h-3.5 w-3.5 text-primary" /> : <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="mono-font max-w-[140px] truncate">{user.email}</span>
                {isAdmin && <span className="mono-label text-primary">ADMIN</span>}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={signOut}
                className="text-muted-foreground hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Sign out</span>
              </Button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              SIGN IN
            </Link>
          )}
        </div>

        <div className="lg:hidden mono-font text-[10px] text-muted-foreground hidden md:inline">{local}</div>
      </div>

      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </header>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="mono-label text-[9px]">{label}</span>
      <span className={cn("text-foreground/90 mono-font")}>{value}</span>
    </div>
  );
}
