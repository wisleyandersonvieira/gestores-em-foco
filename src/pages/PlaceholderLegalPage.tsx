import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlaceholderLegalPage({ title }: { title: string }) {
  const isPrivacyPolicy = title.toLowerCase().includes("privacidade");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <Card className="border-primary/10 bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-3xl">{title}</CardTitle>
          <CardDescription>{isPrivacyPolicy ? "Estrutura inicial para revisao juridica e publicacao oficial." : "Pagina placeholder para publicacao do conteudo juridico oficial."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPrivacyPolicy ? (
            <div className="space-y-5 text-sm leading-7 text-muted-foreground">
              <LegalSection title="Quais dados coletamos" text="Coletamos dados cadastrais, informacoes de perfil, preferencias da conta, produtos contratados e dados inseridos pelo usuario no uso da plataforma." />
              <LegalSection title="Como usamos seus dados" text="Usamos os dados para autenticar o acesso, prestar os servicos contratados, personalizar a experiencia, manter seguranca e cumprir obrigacoes legais." />
              <LegalSection title="Compartilhamento de informacoes" text="Nao vendemos dados pessoais. O compartilhamento pode ocorrer com provedores essenciais da operacao, sempre limitado ao necessario para funcionamento da plataforma." />
              <LegalSection title="Seguranca dos dados" text="Aplicamos controles de acesso, autenticacao e politicas de seguranca para reduzir riscos de acesso indevido." />
              <LegalSection title="Retencao de dados" text="Mantemos dados pelo periodo necessario para prestacao dos servicos, cumprimento contratual, suporte, auditoria e obrigacoes legais." />
              <LegalSection title="Direitos do usuario" text="O usuario pode solicitar acesso, exportacao, correcao e exclusao dos dados, conforme regras aplicaveis e limites legais." />
              <LegalSection title="Solicitacao de exclusao" text="Pedidos de exclusao sao analisados para preservar seguranca, assinaturas, historico financeiro e registros obrigatorios." />
              <LegalSection title="Contato" text="Solicitacoes relacionadas a privacidade podem ser enviadas pela area de Configuracoes da plataforma ou pelos canais oficiais de suporte." />
            </div>
          ) : null}
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/">Voltar para o inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function LegalSection({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1">{text}</p>
    </section>
  );
}
