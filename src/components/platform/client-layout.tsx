import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, Home, LayoutGrid, LogOut, Menu, Package, ReceiptText, Settings, UserCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";
import { getUserProductAccessMap, PRODUCT_SLUGS } from "@/lib/products";
import logo from "@/assets/logo-gestores-em-foco.png";

const generalNavigation = [
  { to: "/dashboard", label: "Início / Dashboard", icon: Home },
  { to: "/meus-produtos", label: "Meus Produtos", icon: Package },
  { to: "/produtos", label: "Todos os Produtos", icon: LayoutGrid },
  { to: "/meus-cursos", label: "Cursos", icon: BookOpen },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const productNavigation = [
  { to: "/diagnosticos", label: "Diagnósticos", icon: BarChart3, slug: PRODUCT_SLUGS.diagnostics },
  { to: "/dre-facil", label: "Gestor de DRE", icon: ReceiptText, slug: PRODUCT_SLUGS.dre },
];

type ClientLayoutProps = {
  children: (user: User) => React.ReactNode;
};

function NavItems({ productAccess, onNavigate }: { productAccess: Set<string>; onNavigate?: () => void }) {
  const navigation = [...generalNavigation, ...productNavigation.filter((item) => productAccess.has(item.slug))];

  return (
    <nav className="grid gap-1">
      {navigation.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? "bg-accent text-accent-foreground" : "text-sidebar-foreground/78 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [productAccess, setProductAccess] = useState<Set<string>>(new Set());
  useTheme(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/entrar?callbackUrl=/dashboard", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/entrar?callbackUrl=/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    async function loadProductAccess() {
      if (!user) return;
      try {
        const map = await getUserProductAccessMap(user.id);
        setProductAccess(new Set(map.keys()));
      } catch {
        setProductAccess(new Set());
      }
    }

    void loadProductAccess();
    window.addEventListener("product-access-updated", loadProductAccess);
    return () => window.removeEventListener("product-access-updated", loadProductAccess);
  }, [user]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-foreground md:block">
        <div className="sticky top-0 flex h-screen flex-col px-5 py-6">
          <Link to="/dashboard" className="mb-8 flex items-center gap-3 rounded-lg bg-white p-3" aria-label="Gestores em Foco">
            <img src={logo} alt="Gestores em Foco" className="h-12 w-auto" />
          </Link>
          <NavItems productAccess={productAccess} />
          <Button variant="ghost" className="mt-auto justify-start gap-3 text-sidebar-foreground/78 hover:bg-white/10 hover:text-white" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div>
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <Link to="/dashboard" className="font-display font-semibold uppercase tracking-wide">Gestores em Foco</Link>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-sidebar text-sidebar-foreground">
                <div className="mt-8 grid gap-8">
                  <div>
                    <p className="font-display text-lg font-semibold uppercase tracking-wide">Gestores em Foco</p>
                    <p className="text-sm text-sidebar-foreground/65">{user.email}</p>
                  </div>
                  <NavItems productAccess={productAccess} onNavigate={() => setOpen(false)} />
                  <Button variant="ghost" className="justify-start gap-3 text-sidebar-foreground/78 hover:bg-white/10 hover:text-white" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">{children(user)}</main>
      </div>
    </div>
  );
}
