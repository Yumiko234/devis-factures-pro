import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, FileText, Users, Package, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const nav = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/documents", label: "Propositions de vente & reçus", icon: FileText },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/products", label: "Catalogue", icon: Package },
  { to: "/settings", label: "Mon entreprise", icon: Settings },
] as const;

function AppLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground md:flex">
        <Link to="/dashboard" className="font-display text-2xl">
          Registre<span className="text-sidebar-primary">.</span>
        </Link>
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-4">
          <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
          <button onClick={signOut} className="mt-2 flex items-center gap-2 text-sm text-sidebar-foreground/80 hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="no-print flex gap-1 overflow-x-auto border-b border-border bg-sidebar p-2 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-accent" }}
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="print-root flex-1 p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
