import { useEffect, type ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const treatmentRows = [
  {
    dados: "Nome, e-mail, telefone, cargo, empresa, setor de atuação e subsetor de atuação.",
    finalidade: "Criar e gerenciar conta, permitir acesso à plataforma, identificar o usuário e personalizar a experiência.",
    forma: "Informações fornecidas pelo usuário em cadastro, atualização de perfil, contratação ou acesso à plataforma.",
    base: "Execução de contrato ou procedimentos preliminares relacionados ao contrato.",
    duracao: "Enquanto a conta estiver ativa e pelo prazo necessário para cumprimento de obrigações legais ou exercício regular de direitos.",
    necessario: "Sim.",
  },
  {
    dados: "Nome, e-mail, histórico de acesso, cursos acessados, progresso em aulas e participação em conteúdos ou atividades.",
    finalidade: "Liberar acesso a cursos e conteúdos, acompanhar progresso, recomendar conteúdos relacionados e melhorar a experiência de aprendizagem.",
    forma: "Gerado durante o uso de cursos, aulas, materiais, conteúdos e soluções digitais.",
    base: "Execução de contrato e legítimo interesse, quando aplicável.",
    duracao: "Enquanto a conta estiver ativa ou enquanto necessário para a prestação do serviço.",
    necessario: "Sim.",
  },
  {
    dados: "Nome, foto de perfil, se houver, setor, subsetor, empresa, cargo, mensagens, comentários, publicações e interações.",
    finalidade: "Permitir participação na comunidade, exibir perfil aos demais usuários, viabilizar networking e interação entre membros, moderar conteúdos e manter segurança.",
    forma: "Informações de perfil e conteúdos publicados ou enviados pelo usuário em áreas comunitárias.",
    base: "Execução de contrato e legítimo interesse.",
    duracao: "Enquanto a conta estiver ativa, salvo exclusão solicitada ou necessidade de preservação para segurança, auditoria ou exercício de direitos.",
    necessario: "Sim, para uso da comunidade.",
  },
  {
    dados: "Nome, e-mail, telefone, setor, subsetor, empresa, cargo e dados de inscrição em eventos.",
    finalidade: "Processar inscrição, comunicar informações sobre eventos, controlar presença e disponibilizar conteúdos relacionados.",
    forma: "Informações fornecidas em formulários de inscrição, confirmação de presença, participação ou interação em eventos.",
    base: "Execução de contrato e consentimento, quando aplicável.",
    duracao: "Pelo período necessário à organização do evento e obrigações legais relacionadas.",
    necessario: "Sim, quando o usuário se inscrever no evento.",
  },
  {
    dados: "Nome, e-mail, telefone e preferências de comunicação.",
    finalidade: "Enviar newsletter, campanhas, novidades, cursos, eventos, funcionalidades e comunicações promocionais.",
    forma: "Informações fornecidas em formulários, preferências de conta, interações comerciais ou cadastros de interesse.",
    base: "Consentimento ou legítimo interesse, conforme o caso.",
    duracao: "Até a revogação do consentimento ou solicitação de descadastro.",
    necessario: "Não para uso básico da plataforma.",
  },
  {
    dados: "Nome, e-mail, telefone, histórico de atendimento e mensagens enviadas pelo usuário.",
    finalidade: "Responder dúvidas, resolver problemas técnicos, registrar solicitações e melhorar o atendimento.",
    forma: "Informações enviadas em canais de atendimento, suporte, formulários, e-mail ou mensagens dentro da plataforma.",
    base: "Execução de contrato e legítimo interesse.",
    duracao: "Pelo tempo necessário para atendimento, auditoria, segurança e exercício regular de direitos.",
    necessario: "Sim, quando o usuário solicitar suporte.",
  },
  {
    dados: "Nome, e-mail, CPF ou CNPJ, se coletado, endereço de cobrança, se coletado, dados de transação e status de pagamento.",
    finalidade: "Processar pagamentos, emitir documentos fiscais, gerenciar assinaturas e prevenir fraudes.",
    forma: "Informações fornecidas no checkout, gestão de assinatura, faturamento ou por provedores de pagamento.",
    base: "Execução de contrato, cumprimento de obrigação legal/regulatória e legítimo interesse para prevenção de fraude.",
    duracao: "Pelo prazo exigido por obrigações legais, fiscais, contábeis ou regulatórias.",
    necessario: "Sim, para serviços pagos.",
  },
  {
    dados: "Endereço IP, tipo de navegador, dispositivo, sistema operacional, data e hora de acesso, páginas acessadas e logs de uso.",
    finalidade: "Segurança da plataforma, prevenção de fraude, diagnóstico técnico, auditoria e melhoria do serviço.",
    forma: "Coleta automática durante a navegação, autenticação, uso da plataforma e interação com os sistemas.",
    base: "Legítimo interesse e cumprimento de obrigação legal, quando aplicável.",
    duracao: "Pelo prazo necessário para segurança, auditoria e cumprimento de obrigações legais.",
    necessario: "Sim, para segurança e funcionamento.",
  },
  {
    dados: "Identificadores de cookies, dados de sessão, preferências, eventos de navegação e métricas de uso.",
    finalidade: "Manter sessão ativa, lembrar preferências, medir audiência, melhorar a plataforma e personalizar experiência.",
    forma: "Cookies, pixels, tags, SDKs e tecnologias semelhantes, conforme configuração do navegador e preferências do usuário.",
    base: "Legítimo interesse para cookies essenciais e consentimento para cookies não essenciais, quando aplicável.",
    duracao: "Conforme tipo de cookie e preferências do usuário.",
    necessario: "Cookies essenciais: sim. Cookies não essenciais: não.",
  },
];

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "Política de Privacidade | Gestores em Foco";

    const description =
      "Política de Privacidade da Gestores em Foco: dados coletados, finalidades, bases legais, cookies, compartilhamento, direitos LGPD e canal de privacidade.";
    let metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');

    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }

    metaDescription.content = description;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <header className="mb-10 border-b border-border/60 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Legal</p>
          <h1 className="font-display mt-3 text-4xl font-semibold text-foreground">Política de Privacidade</h1>
          <p className="mt-3 text-sm text-muted-foreground">Última atualização: Maio de 2026</p>
        </header>

        <div className="space-y-10 text-base leading-8 text-muted-foreground">
          <Section number="1" title="Informações gerais">
            <p>
              A Gestores em Foco é uma plataforma voltada a gestores, empresários, profissionais de negócios e demais
              usuários interessados em cursos, conteúdos, comunidades, eventos e soluções digitais para gestão.
            </p>
            <p className="mt-4">
              Esta Política de Privacidade explica, de forma clara, como a Gestores em Foco coleta, utiliza, armazena,
              compartilha e protege dados pessoais no site gestoresemfoco.com.br e nos ambientes digitais relacionados à
              plataforma. O tratamento de dados pessoais é realizado em conformidade com a Lei Geral de Proteção de Dados
              Pessoais, Lei nº 13.709/2018 ("LGPD"), e com boas práticas de transparência e segurança.
            </p>
          </Section>

          <Section number="2" title="Definições importantes da LGPD">
            <DefinitionList
              items={[
                ["Dado pessoal", "informação relacionada a pessoa natural identificada ou identificável."],
                ["Dado pessoal sensível", "dado sobre origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, saúde, vida sexual, dado genético ou biométrico, quando vinculado a uma pessoa natural."],
                ["Dado anonimizado", "dado que não permite identificar o titular, considerando meios técnicos razoáveis disponíveis no momento do tratamento."],
                ["Titular", "pessoa natural a quem se referem os dados pessoais."],
                ["Controlador", "pessoa ou organização que toma as decisões sobre o tratamento de dados pessoais."],
                ["Operador", "pessoa ou organização que trata dados pessoais em nome do controlador."],
                ["Encarregado", "pessoa indicada para atuar como canal de comunicação entre controlador, titulares e ANPD."],
                ["Tratamento", "qualquer operação com dados pessoais, como coleta, uso, armazenamento, compartilhamento, eliminação ou acesso."],
                ["Consentimento", "manifestação livre, informada e inequívoca pela qual o titular concorda com determinada finalidade de tratamento."],
                ["Uso compartilhado", "comunicação, transferência ou tratamento compartilhado de dados pessoais entre controladores, operadores ou terceiros autorizados."],
                ["Transferência internacional de dados", "envio ou disponibilização de dados pessoais para país estrangeiro ou organismo internacional."],
                ["ANPD", "Autoridade Nacional de Proteção de Dados, órgão responsável por zelar, implementar e fiscalizar o cumprimento da LGPD no Brasil."],
              ]}
            />
          </Section>

          <Section number="3" title="Identificação do controlador">
            <p>
              Para fins desta Política, a Gestores em Foco atua como controladora dos dados pessoais tratados em seus
              ambientes digitais, pois define as principais finalidades e meios de tratamento relacionados à operação da
              plataforma.
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-foreground">Plataforma:</strong> Gestores em Foco
              </li>
              <li>
                <strong className="text-foreground">Site:</strong> gestoresemfoco.com.br
              </li>
              <li>
                <strong className="text-foreground">E-mail principal:</strong>{" "}
                <EmailLink email="contato@gestoresemfoco.com.br" />
              </li>
              <li>
                <strong className="text-foreground">Canal de privacidade:</strong>{" "}
                <EmailLink email="privacidade@gestoresemfoco.com.br" />
              </li>
            </ul>
          </Section>

          <Section number="4" title="Dados pessoais coletados">
            <p>
              Os dados coletados podem variar conforme a forma de uso da plataforma, os produtos contratados, as
              preferências configuradas e as interações realizadas pelo usuário. Em geral, podemos tratar:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Dados de cadastro e identificação, como nome, e-mail, telefone, cargo, empresa, setor e subsetor de atuação.</li>
              <li>Dados de perfil, incluindo foto de perfil, quando enviada pelo usuário, preferências e informações profissionais.</li>
              <li>Dados de uso de cursos, conteúdos, soluções digitais, comunidade, fóruns, networking e eventos.</li>
              <li>Dados de atendimento, suporte, solicitações, mensagens e comunicações enviadas à Gestores em Foco.</li>
              <li>Dados de pagamento e faturamento, quando aplicável a serviços pagos.</li>
              <li>Dados técnicos, de navegação, logs, cookies e tecnologias semelhantes.</li>
            </ul>
            <p className="mt-4">
              A Gestores em Foco não solicita que usuários publiquem dados pessoais sensíveis na plataforma. Caso o
              usuário insira esse tipo de informação voluntariamente em mensagens, publicações ou campos livres, o
              tratamento poderá ocorrer apenas na medida necessária para operar, moderar, proteger ou cumprir obrigações
              relacionadas à plataforma.
            </p>
          </Section>

          <Section number="5" title="Finalidade, forma, base legal e duração do tratamento">
            <p>
              A tabela abaixo resume os principais tratamentos realizados pela Gestores em Foco. As bases legais podem
              variar conforme o contexto concreto de uso, sempre observando a LGPD.
            </p>
            <TreatmentTable />
          </Section>

          <Section number="6" title="Comunidade, fóruns, interações e eventos">
            <p>
              A Gestores em Foco pode oferecer áreas de comunidade, fóruns, publicações, comentários, mensagens,
              networking e eventos voltados à troca de experiências entre gestores e profissionais de negócios.
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Algumas informações do perfil, como nome, foto, empresa, cargo, setor e subsetor, podem ser visíveis para outros membros autorizados.</li>
              <li>Publicações, comentários e mensagens feitas em áreas comunitárias podem ser visualizadas por outros usuários autorizados, conforme regras e configurações da plataforma.</li>
              <li>O usuário deve evitar publicar dados pessoais sensíveis ou informações de terceiros sem autorização adequada.</li>
              <li>A plataforma pode moderar, remover ou restringir conteúdos que violem regras de uso, legislação aplicável ou direitos de terceiros.</li>
              <li>Em eventos, podemos usar dados de inscrição e participação para organização, comunicação, controle de presença e disponibilização de materiais relacionados.</li>
            </ul>
          </Section>

          <Section number="7" title="Cookies e tecnologias semelhantes">
            <p>
              A Gestores em Foco utiliza cookies e tecnologias semelhantes para permitir o funcionamento da plataforma,
              melhorar a experiência do usuário, entender o uso dos serviços e, quando aplicável, apoiar comunicações e
              campanhas.
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-foreground">Cookies essenciais:</strong> necessários para login, sessão,
                segurança, prevenção de fraude e funcionamento básico da plataforma.
              </li>
              <li>
                <strong className="text-foreground">Cookies de preferência:</strong> usados para lembrar escolhas do
                usuário, como configurações e preferências de navegação.
              </li>
              <li>
                <strong className="text-foreground">Cookies de analytics:</strong> usados para medir audiência,
                compreender interações e melhorar a plataforma. Os dados podem ser tratados de forma agregada,
                pseudonimizada ou anonimizada quando possível.
              </li>
              <li>
                <strong className="text-foreground">Cookies de marketing, se houver:</strong> usados para medir
                campanhas, personalizar comunicações ou avaliar interesse em conteúdos, cursos, eventos e funcionalidades.
              </li>
            </ul>
            <p className="mt-4">
              Quando houver banner ou central de preferências, o usuário poderá aceitar, rejeitar ou configurar cookies
              não essenciais. Também é possível gerenciar cookies pelas configurações do navegador. A desativação de
              cookies essenciais pode prejudicar ou impedir o funcionamento de áreas da plataforma.
            </p>
          </Section>

          <Section number="8" title="Uso compartilhado de dados pessoais">
            <p>
              A Gestores em Foco não vende dados pessoais. O compartilhamento ocorre apenas quando necessário para
              operar, proteger, melhorar ou cumprir obrigações relacionadas à plataforma.
            </p>
            <p className="mt-4">Podemos compartilhar dados pessoais com as seguintes categorias de terceiros:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Provedores de hospedagem, infraestrutura, banco de dados e segurança.</li>
              <li>Provedores de e-mail, comunicação, autenticação e entrega de mensagens.</li>
              <li>Ferramentas de analytics, diagnóstico técnico e métricas de uso.</li>
              <li>Plataformas de pagamento, faturamento, cobrança e prevenção a fraude.</li>
              <li>Ferramentas de suporte, atendimento, relacionamento e marketing.</li>
              <li>Prestadores relacionados à organização, transmissão, controle e comunicação de eventos.</li>
              <li>Autoridades públicas, órgãos reguladores ou terceiros, quando exigido por lei, ordem judicial ou exercício regular de direitos.</li>
            </ul>
            <p className="mt-4">
              Terceiros que atuam como operadores devem tratar dados pessoais conforme instruções da Gestores em Foco,
              limites contratuais e medidas de segurança compatíveis. Em caso de correção, eliminação, anonimização ou
              bloqueio de dados, quando aplicável, a Gestores em Foco poderá comunicar operadores e parceiros relevantes.
            </p>
          </Section>

          <Section number="9" title="Transferência internacional de dados">
            <p>
              Alguns fornecedores de tecnologia utilizados pela Gestores em Foco podem processar ou armazenar dados fora
              do Brasil, especialmente serviços de infraestrutura, hospedagem, analytics, suporte, e-mail, pagamento ou
              segurança.
            </p>
            <p className="mt-4">
              Quando ocorrer transferência internacional de dados, a Gestores em Foco adotará medidas para buscar
              proteção adequada aos dados pessoais, conforme a LGPD, incluindo avaliação de fornecedores, contratos,
              medidas técnicas e controles de segurança compatíveis com o tipo de tratamento.
            </p>
          </Section>

          <Section number="10" title="Armazenamento e segurança">
            <p>
              Os dados pessoais são mantidos pelo tempo necessário para cumprir as finalidades informadas nesta Política,
              prestar os serviços, atender solicitações dos usuários, cumprir obrigações legais, preservar segurança,
              realizar auditorias e exercer direitos em processos administrativos, judiciais ou arbitrais.
            </p>
            <p className="mt-4">
              Adotamos medidas técnicas e administrativas razoáveis e compatíveis com o mercado, incluindo controles de
              acesso, criptografia quando aplicável, registro de logs, boas práticas de desenvolvimento e monitoramento
              de segurança.
            </p>
            <p className="mt-4">
              Nenhum ambiente digital é absolutamente seguro. Por isso, também recomendamos que o usuário mantenha sua
              senha protegida, utilize dispositivos confiáveis e comunique qualquer suspeita de uso indevido da conta.
            </p>
          </Section>

          <Section number="11" title="Direitos do titular de dados pessoais">
            <p>
              Nos termos do art. 18 da LGPD, o titular pode solicitar à Gestores em Foco, conforme aplicável:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Confirmação da existência de tratamento de dados pessoais.</li>
              <li>Acesso aos dados pessoais tratados.</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.</li>
              <li>Portabilidade dos dados, observadas as normas da autoridade nacional e os segredos comercial e industrial.</li>
              <li>Eliminação dos dados pessoais tratados com base no consentimento, quando aplicável.</li>
              <li>Informação sobre entidades públicas e privadas com as quais houve uso compartilhado de dados.</li>
              <li>Informação sobre a possibilidade de não fornecer consentimento e sobre as consequências da negativa.</li>
              <li>Revogação do consentimento.</li>
              <li>Oposição ao tratamento realizado em descumprimento da LGPD.</li>
              <li>Revisão de decisões tomadas unicamente com base em tratamento automatizado de dados pessoais, se houver.</li>
              <li>Peticionamento perante a ANPD e órgãos de defesa do consumidor.</li>
            </ul>
            <p className="mt-4">
              As solicitações serão avaliadas conforme a legislação aplicável. Em alguns casos, a Gestores em Foco poderá
              manter determinados dados para cumprir obrigações legais, preservar segurança, prevenir fraude ou exercer
              direitos.
            </p>
          </Section>

          <Section number="12" title="Encarregado/DPO e canal de atendimento">
            <p>
              Conforme o art. 41 da LGPD, a Gestores em Foco indica o seguinte encarregado pelo tratamento de dados
              pessoais:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-foreground">Nome:</strong> Wisley Anderson Vieira
              </li>
              <li>
                <strong className="text-foreground">E-mail:</strong> <EmailLink email="privacidade@gestoresemfoco.com.br" />
              </li>
            </ul>
            <p className="mt-4">
              Esse canal pode ser utilizado para dúvidas, solicitações de direitos dos titulares, comunicações sobre
              privacidade e assuntos relacionados ao tratamento de dados pessoais.
            </p>
          </Section>

          <Section number="13" title="Dados de menores de idade">
            <p>
              A plataforma Gestores em Foco não é destinada a menores de 18 anos. O cadastro e o uso dos serviços devem
              ser realizados por pessoas maiores de idade e capazes.
            </p>
            <p className="mt-4">
              Caso seja identificado cadastro de menor de idade sem autorização adequada, a Gestores em Foco poderá
              excluir, bloquear ou restringir a conta e os dados relacionados, conforme necessário para cumprir a LGPD e
              proteger o titular.
            </p>
          </Section>

          <Section number="14" title="Alterações nesta política">
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças na plataforma, nos
              serviços, em requisitos legais ou em práticas de segurança e privacidade.
            </p>
            <p className="mt-4">
              Alterações relevantes poderão ser comunicadas por canais disponíveis na plataforma, como avisos no site,
              e-mail ou notificações internas. A data da última atualização será sempre indicada no início desta página.
            </p>
          </Section>

          <Section number="15" title="Contato">
            <p>Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento de dados pessoais:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-foreground">Canal de privacidade/DPO:</strong>{" "}
                <EmailLink email="privacidade@gestoresemfoco.com.br" />
              </li>
              <li>
                <strong className="text-foreground">E-mail principal:</strong>{" "}
                <EmailLink email="contato@gestoresemfoco.com.br" />
              </li>
              <li>
                <strong className="text-foreground">Site:</strong>{" "}
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

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {number}. {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DefinitionList({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map(([term, description]) => (
        <div key={term} className="rounded-lg border border-border/70 bg-card/60 p-4">
          <dt className="font-semibold text-foreground">{term}</dt>
          <dd className="mt-1 text-sm leading-6">{description}</dd>
        </div>
      ))}
    </dl>
  );
}

function TreatmentTable() {
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-border/70">
      <table className="min-w-[1100px] border-collapse bg-card/40 text-left text-sm leading-6">
        <thead className="bg-muted/70 text-foreground">
          <tr>
            <TableHeader>Dados pessoais coletados</TableHeader>
            <TableHeader>Finalidade do tratamento</TableHeader>
            <TableHeader>Forma de coleta/tratamento</TableHeader>
            <TableHeader>Base legal</TableHeader>
            <TableHeader>Duração do tratamento</TableHeader>
            <TableHeader>O tratamento é necessário para o serviço?</TableHeader>
          </tr>
        </thead>
        <tbody>
          {treatmentRows.map((row, index) => (
            <tr key={row.dados} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <TableCell>{row.dados}</TableCell>
              <TableCell>{row.finalidade}</TableCell>
              <TableCell>{row.forma}</TableCell>
              <TableCell>{row.base}</TableCell>
              <TableCell>{row.duracao}</TableCell>
              <TableCell>{row.necessario}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHeader({ children }: { children: ReactNode }) {
  return <th className="min-w-44 border-b border-r border-border/70 px-4 py-3 align-top font-semibold last:border-r-0">{children}</th>;
}

function TableCell({ children }: { children: ReactNode }) {
  return <td className="border-r border-t border-border/60 px-4 py-4 align-top last:border-r-0">{children}</td>;
}

function EmailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="font-medium text-primary underline underline-offset-2 transition hover:text-primary/80">
      {email}
    </a>
  );
}
