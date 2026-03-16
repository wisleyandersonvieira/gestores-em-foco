# Gestores em Foco

Base SaaS em `Next.js 14` para diagnosticos empresariais usados por mentores, coaches e organizadores de summits.

## Stack

- Next.js 14 + App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL / Supabase
- NextAuth com login por email e senha

## Primeira entrega

Esta fase implementa a base do produto:

- landing page institucional
- cadastro e login
- protecao de rotas para `/minha-conta` e `/admin`
- schema Prisma completo
- seed com usuario admin, usuario cliente e modelo demo
- rota publica `/diagnostico/[token]` com validacao inicial

## Ambiente

1. Instale dependencias:

```bash
npm install
```

2. Configure o ambiente:

```bash
cp .env.example .env
```

3. Gere o client Prisma e rode a migration:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Popule dados de teste:

```bash
npm run prisma:seed
```

5. Inicie a aplicacao:

```bash
npm run dev
```

## Credenciais seed

- Admin: `admin@gestoresemfoco.com` / `Admin@123`
- Cliente: `cliente@exemplo.com` / `Cliente@123`

## Proximas fases

- CRUD de modelos de diagnostico
- construtor com React Flow
- gerador de links
- persistencia de respostas
- relatorio final com score e radar chart
