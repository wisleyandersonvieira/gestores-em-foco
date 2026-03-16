import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-display text-6xl font-semibold text-primary">404</h1>
      <p className="text-lg text-muted-foreground">Pagina nao encontrada.</p>
      <Button asChild>
        <Link to="/">Voltar ao inicio</Link>
      </Button>
    </main>
  );
}
