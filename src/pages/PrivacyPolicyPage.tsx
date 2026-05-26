import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <header className="mb-10 border-b border-border/60 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Legal</p>
          <h1 className="font-display mt-3 text-4xl font-semibold text-foreground">Política de Privacidade</h1>
          <p className="mt-3 text-sm text-muted-foreground">Última atualização: Maio de 2026</p>
        </header>

        <div className="space-y-10 text-base leading-8 text-muted-foreground">
          <Section number="1" title="Informações Gerais">
            <p>
              A plataforma Gestores em Foco (gestoresemfoco.com.br) é comprometida com a proteção da privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </Section>

          <Section number="2" title="Dados que Coletamos">
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li><strong className="text-foreground">Dados de cadastro:</strong> nome, e-mail, telefone, setor de atuação, cargo.</li>
              <li><strong className="text-foreground">Dados de navegação:</strong> endereço IP, tipo de navegador, páginas acessadas, tempo de permanência.</li>
              <li><strong className="text-foreground">Dados de cookies:</strong> preferências de navegação, identificadores de sessão, dados de analytics.</li>
            </ul>
          </Section>

          <Section number="3" title="Finalidade do Uso dos Dados">
            <p>Utilizamos seus dados para:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Possibilitar o acesso e uso da plataforma (cursos, soluções, comunidades).</li>
              <li>Personalizar sua experiência e recomendar conteúdos relevantes.</li>
              <li>Enviar comunicações sobre novos cursos, funcionalidades e atualizações (com seu consentimento).</li>
              <li>Melhorar nossos produtos e serviços por meio de análises de uso.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </Section>

          <Section number="4" title="Cookies">
            <p>Nosso site utiliza cookies para:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li><strong className="text-foreground">Cookies essenciais:</strong> necessários para o funcionamento da plataforma (login, sessão, segurança).</li>
              <li><strong className="text-foreground">Cookies de analytics:</strong> para entender como os usuários interagem com o site (ex.: Google Analytics). Esses dados são anonimizados.</li>
              <li><strong className="text-foreground">Cookies de preferência:</strong> para lembrar suas configurações e escolhas.</li>
            </ul>
            <p className="mt-4">
              Você pode gerenciar cookies nas configurações do seu navegador. A desativação de alguns cookies pode afetar a funcionalidade do site.
            </p>
          </Section>

          <Section number="5" title="Compartilhamento de Dados">
            <p>
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais. Podemos compartilhar dados com:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Prestadores de serviço que auxiliam na operação da plataforma (hospedagem, e-mail, analytics), sob contratos de confidencialidade.</li>
              <li>Autoridades legais, quando exigido por lei.</li>
            </ul>
          </Section>

          <Section number="6" title="Armazenamento e Segurança">
            <p>
              Seus dados são armazenados em servidores seguros com criptografia. Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, perda ou alteração.
            </p>
          </Section>

          <Section number="7" title="Seus Direitos (LGPD)">
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Confirmar a existência de tratamento dos seus dados.</li>
              <li>Acessar seus dados pessoais.</li>
              <li>Corrigir dados incompletos ou desatualizados.</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
              <li>Solicitar a portabilidade dos dados.</li>
              <li>Revogar seu consentimento a qualquer momento.</li>
            </ul>
            <p className="mt-4">
              Para exercer seus direitos, entre em contato pelo e-mail:{" "}
              <a href="mailto:contato@gestoresemfoco.com.br" className="font-medium text-primary underline underline-offset-2 transition hover:text-primary/80">
                contato@gestoresemfoco.com.br
              </a>
            </p>
          </Section>

          <Section number="8" title="Alterações nesta Política">
            <p>
              Esta política pode ser atualizada periodicamente. Recomendamos que a consulte regularmente. A data da última atualização será sempre informada no topo desta página.
            </p>
          </Section>

          <Section number="9" title="Contato">
            <p>Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>
                E-mail:{" "}
                <a href="mailto:contato@gestoresemfoco.com.br" className="font-medium text-primary underline underline-offset-2 transition hover:text-primary/80">
                  contato@gestoresemfoco.com.br
                </a>
              </li>
              <li>
                Site:{" "}
                <a href="https://gestoresemfoco.com.br" className="font-medium text-primary underline underline-offset-2 transition hover:text-primary/80">
                  gestoresemfoco.com.br
                </a>
              </li>
            </ul>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {number}. {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
