import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlaceholderLegalPage({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <Card className="border-primary/10 bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-3xl">{title}</CardTitle>
          <CardDescription>Pagina placeholder para publicacao do conteudo juridico oficial.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/">Voltar para o inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
