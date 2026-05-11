create table if not exists public.business_sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  display_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_sectors_slug_unique unique (slug),
  constraint business_sectors_name_not_blank check (length(trim(name)) > 0),
  constraint business_sectors_slug_not_blank check (length(trim(slug)) > 0)
);

create table if not exists public.business_subsectors (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references public.business_sectors(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  display_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_subsectors_sector_slug_unique unique (sector_id, slug),
  constraint business_subsectors_name_not_blank check (length(trim(name)) > 0),
  constraint business_subsectors_slug_not_blank check (length(trim(slug)) > 0)
);

create index if not exists business_sectors_is_active_idx on public.business_sectors(is_active);
create index if not exists business_subsectors_sector_id_idx on public.business_subsectors(sector_id);
create index if not exists business_subsectors_is_active_idx on public.business_subsectors(is_active);
create index if not exists business_subsectors_sector_active_idx on public.business_subsectors(sector_id, is_active);

drop trigger if exists set_business_sectors_updated_at on public.business_sectors;
drop trigger if exists set_business_subsectors_updated_at on public.business_subsectors;

create trigger set_business_sectors_updated_at before update on public.business_sectors
  for each row execute function public.set_updated_at();

create trigger set_business_subsectors_updated_at before update on public.business_subsectors
  for each row execute function public.set_updated_at();

alter table public.profiles
add column if not exists company_name text,
add column if not exists sector_id uuid references public.business_sectors(id) on delete set null,
add column if not exists subsector_id uuid references public.business_subsectors(id) on delete set null;

alter table public.user_profiles
add column if not exists sector_id uuid references public.business_sectors(id) on delete set null,
add column if not exists subsector_id uuid references public.business_subsectors(id) on delete set null;

create or replace function public.validate_profile_sector_subsector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subsector_id is not null then
    if new.sector_id is null then
      raise exception 'sector_required_for_subsector';
    end if;

    if not exists (
      select 1
      from public.business_subsectors bs
      where bs.id = new.subsector_id
        and bs.sector_id = new.sector_id
    ) then
      raise exception 'subsector_must_belong_to_sector';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_profiles_sector_subsector on public.profiles;
drop trigger if exists validate_user_profiles_sector_subsector on public.user_profiles;

create trigger validate_profiles_sector_subsector
before insert or update of sector_id, subsector_id on public.profiles
for each row execute function public.validate_profile_sector_subsector();

create trigger validate_user_profiles_sector_subsector
before insert or update of sector_id, subsector_id on public.user_profiles
for each row execute function public.validate_profile_sector_subsector();

alter table public.business_sectors enable row level security;
alter table public.business_subsectors enable row level security;

drop policy if exists "Public can read active business sectors" on public.business_sectors;
drop policy if exists "Admins can manage business sectors" on public.business_sectors;
drop policy if exists "Public can read active business subsectors" on public.business_subsectors;
drop policy if exists "Admins can manage business subsectors" on public.business_subsectors;

create policy "Public can read active business sectors"
on public.business_sectors
for select
to anon, authenticated
using (is_active = true or public.is_admin());

create policy "Admins can manage business sectors"
on public.business_sectors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active business subsectors"
on public.business_subsectors
for select
to anon, authenticated
using (
  public.is_admin()
  or (
    is_active = true
    and exists (
      select 1
      from public.business_sectors bs
      where bs.id = business_subsectors.sector_id
        and bs.is_active = true
    )
  )
);

create policy "Admins can manage business subsectors"
on public.business_subsectors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.slugify_business_catalog(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    translate(
      lower(coalesce(value, '')),
      'áàâãäåāéèêëēíìîïīóòôõöōúùûüūçñýÿ',
      'aaaaaaaaeeeeeeiiiiioooooouuuuuucnyy'
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

do $$
declare
  v_data jsonb := $catalog$
[
{"sector":"Agronegócio","subsectors":["Produção de Grãos (Soja, Milho, Trigo, etc.)","Pecuária de Corte","Pecuária Leiteira","Avicultura (Frangos e Ovos)","Suinocultura","Piscicultura / Aquicultura","Horticultura / Olericultura","Fruticultura","Cafeicultura","Cana-de-Açúcar","Silvicultura / Reflorestamento","Floricultura e Plantas Ornamentais","Apicultura / Produção de Mel","Produção de Orgânicos","Agricultura de Precisão / AgTech"]},
{"sector":"Alimentação e Bebidas","subsectors":["Restaurante","Pizzaria","Hamburgueria","Lanchonete","Cafeteria","Padaria","Confeitaria","Sorveteria","Food Truck","Marmitaria / Delivery de Refeições","Churrascaria","Bar / Pub","Casa de Sucos e Smoothies","Sushi / Comida Japonesa","Distribuidora de Bebidas","Choperia","Diversos"]},
{"sector":"Comércio - Agropecuário","subsectors":["Loja Agropecuária","Loja de Insumos Agrícolas","Loja de Máquinas e Implementos Agrícolas","Loja de Produtos Veterinários","Loja de Sementes e Mudas","Cooperativa Agrícola"]},
{"sector":"Comércio - Casa, Construção e Decoração","subsectors":["Loja de Materiais de Construção","Madeireira","Vidraçaria","Marmoraria","Loja de Móveis","Loja de Colchões","Loja de Decoração e Design de Interiores","Loja de Iluminação","Loja de Utilidades Domésticas","Loja de Eletrodomésticos","Loja de Ar Condicionado e Climatização","Loja de Piscinas e Acessórios"]},
{"sector":"Comércio - Moda e Vestuário","subsectors":["Loja de Roupas, Calçados e Acessórios","Loja de Tecidos e Aviamentos","Sapataria / Conserto de Calçados","Loja de Jóias e Bijuterias","Loja de Relógios","Ótica"]},
{"sector":"Comércio - Tecnologia e Eletrônicos","subsectors":["Loja de Informática","Computadores","Celulares","Audio","Assistência Técnica de Eletrônicos","Loja de Automação Residencial"]},
{"sector":"Comércio - Varejo em Geral","subsectors":["Supermercado","Mercearia / Minimercado","Atacado / Atacarejo","Loja de Conveniência","Empório / Produtos Gourmet","Loja de Produtos Naturais e Orgânicos","Hortifrúti","Casa de Carnes / Açougue","Peixaria","Adega / Casa de Vinhos","Tabacaria","Loja de Cosméticos e Perfumaria","Farmácia / Drogaria","Papelaria e Livraria","Loja de Presentes e Decoração","Loja de Artigos para Festas","Loja de Embalagens","Loja de Artesanato","Loja de Brinquedos","Floricultura","Sex Shop","Pet Shop","Loja de Suplementos e Nutrição Esportiva"]},
{"sector":"Comércio - Veículos e Peças","subsectors":["Concessionária / Revenda de Veículos","Loja de Veículos Usados / Seminovos","Loja de Autopeças"]},
{"sector":"Economia Criativa","subsectors":["Produtora Audiovisual / Cinema","Estúdio de Design e Criação","Editora de Livros / Revista","Galeria de Arte","Ateliê / Estúdio de Artes","Produtora Musical / Estúdio de Gravação","Game Design / Desenvolvimento de Jogos","Moda Autoral / Estilista","Artesanato Profissional"]},
{"sector":"Energia e Sustentabilidade","subsectors":["Energia Solar (Instalação e Venda)","Consultoria em Eficiência Energética","Empresa de Reciclagem e Gestão de Resíduos","Tratamento de Água e Efluentes","Empresa de Coleta Seletiva","Consultoria Ambiental e Sustentabilidade","Empresa de Bioenergia / Biomassa"]},
{"sector":"Entretenimento e Lazer","subsectors":["Casa de Shows / Casa Noturna","Boliche / Fliperama / Arcade","Escape Room / Jogos de Aventura","Cinema","Teatro","Parque de Diversões","Clube Social e Esportivo","Lan House / E-Sports Arena","Brinquedoteca / Espaço Kids","Kartódromo / Paintball / Airsoft","Produtora de Eventos","DJ / Banda / Entretenimento Musical"]},
{"sector":"Esporte e Fitness","subsectors":["Academia de Musculação e Fitness","Studio de CrossFit","Studio de Pilates","Studio de Yoga","Studio de Dança","Escola de Natação","Escola de Artes Marciais / Lutas","Quadra de Futebol Society / Beach Tennis","Centro de Treinamento Funcional","Personal Trainer / Assessoria Esportiva","Loja de Artigos Esportivos"]},
{"sector":"Franquias e Licenciamentos","subsectors":["Franqueador (Rede de Franquias)","Franqueado (Unidade de Franquia)","Consultoria em Franquias","Licenciamento de Marcas"]},
{"sector":"Indústria - Alimentícia","subsectors":["Fábrica de Alimentos (Geral)","Frigorífico / Abatedouro","Laticínio","Indústria de Bebidas","Panificação e Confeitaria Industrial","Indústria de Embutidos","Indústria de Conservas e Enlatados","Indústria de Temperos e Condimentos","Indústria de Alimentos Congelados","Torrefação de Café","Usina de Açúcar e Álcool"]},
{"sector":"Indústria - Construção Civil","subsectors":["Fábrica de Blocos e Artefatos de Concreto","Fábrica de Estruturas Pré-Moldadas","Fábrica de Telhas e Cerâmicas","Fábrica de Porcelanato e Revestimentos","Concreteira / Usina de Concreto","Pedreira / Mineração"]},
{"sector":"Indústria - Gráfica e Embalagens","subsectors":["Gráfica Offset / Digital","Fábrica de Embalagens de Papelão","Fábrica de Embalagens Flexíveis","Fábrica de Rótulos e Etiquetas","Editora / Produção Editorial"]},
{"sector":"Indústria - Madeira e Móveis","subsectors":["Indústria Moveleira","Serraria / Beneficiamento de Madeira","Fábrica de Portas e Esquadrias","Fábrica de Pallets e Caixas","Fábrica de MDF e Compensados","Fábrica de Móveis Planejados"]},
{"sector":"Indústria - Metalúrgica e Mecânica","subsectors":["Metalúrgica","Usinagem / Tornearia","Caldeiraria e Estruturas Metálicas","Fundição","Galvanoplastia / Tratamento de Superfícies","Fábrica de Máquinas e Equipamentos","Ferramentaria","Indústria de Parafusos e Fixadores"]},
{"sector":"Indústria - Química e Plásticos","subsectors":["Indústria Química","Fábrica de Produtos de Limpeza","Fábrica de Cosméticos","Indústria de Plásticos","Indústria de Embalagens","Indústria de Tintas e Vernizes","Indústria de Borracha","Indústria de Fertilizantes e Defensivos"]},
{"sector":"Indústria - Têxtil e Confecção","subsectors":["Confecção / Fábrica de Roupas","Facção Têxtil","Malharia","Estamparia / Serigrafia","Fábrica de Uniformes","Indústria de Tecidos","Lavanderia Industrial Têxtil","Bordado Industrial"]},
{"sector":"Serviços - Beleza e Estética","subsectors":["Salão de Beleza / Cabeleireiro","Barbearia","Studio de Unhas / Manicure e Pedicure","Studio de Sobrancelhas e Cílios","Studio de Maquiagem","Studio de Depilação","Clínica de Estética Facial e Corporal","Studio de Bronzeamento","SPA e Day SPA","Studio de Micropigmentação","Diversos"]},
{"sector":"Serviços - Comunicação e Marketing","subsectors":["Agência de Publicidade e Propaganda","Assessoria de Imprensa / RP","Produtora de Vídeo e Audiovisual","Estúdio Fotográfico","Gráfica e Impressão Digital","Agência de Eventos","Agência de Influenciadores","Pesquisa de Mercado","Empresa de Brindes e Produtos Promocionais","Locução e Produção de Áudio / Podcast"]},
{"sector":"Serviços - Contabilidade e Finanças","subsectors":["Escritório de Contabilidade","Consultoria Financeira","Consultoria Tributária e Fiscal","Escritório de Auditoria","Assessoria de Investimentos","Correspondente Bancário","Factoring / Antecipação de Recebíveis","Perícia Contábil","Gestão de Folha de Pagamento","Consultoria de Crédito e Financiamento"]},
{"sector":"Serviços - Educação e Treinamento","subsectors":["Escola de Educação","Escola de Idiomas","Escola de Informática e Tecnologia","Autoescola / Centro de Formação de Condutores","Escola de Música","Escola de Dança","Escola de Artes","Escola de Culinária / Gastronomia","Escola de Esportes e Artes Marciais","Centro de Reforço Escolar e Tutoria","Treinamento Corporativo e Desenvolvimento","Coaching e Mentoria"]},
{"sector":"Serviços - Engenharia e Arquitetura","subsectors":["Escritório de Arquitetura","Escritório de Engenharia Civil","Escritório de Engenharia Elétrica","Escritório de Engenharia Mecânica","Escritório de Design de Interiores","Empresa de Projetos Estruturais","Empresa de Topografia e Georreferenciamento","Consultoria Ambiental / Licenciamento","Paisagismo","Empresa de Laudos e Perícias Técnicas"]},
{"sector":"Serviços - Imobiliário","subsectors":["Imobiliária","Corretor de Imóveis Autônomo","Construtora / Incorporadora","Administradora de Aluguéis","Consultoria Imobiliária","Empresa de Loteamento e Urbanismo"]},
{"sector":"Serviços - Jurídico","subsectors":["Escritório de Advocacia","Consultoria Jurídica Empresarial","Recuperação de Crédito / Cobrança"]},
{"sector":"Serviços - Limpeza e Conservação","subsectors":["Empresa de Limpeza Comercial / Residencial","Lavanderia / Passadoria","Lavanderia Industrial","Empresa de Controle de Pragas / Dedetização","Limpeza de Estofados e Carpetes","Limpeza Pós-Obra","Higienização de Ar Condicionado","Tratamento de Piso"]},
{"sector":"Serviços - Manutenção e Reparos","subsectors":["Oficina Mecânica Automotiva","Funilaria e Pintura","Oficina de Motos","Borracharia / Serviço de Pneus","Eletricista Automotivo","Eletricista Predial / Residencial","Encanador / Serviços Hidráulicos","Serralheria","Marcenaria / Carpintaria","Refrigeração e Ar Condicionado","Assistência Técnica de Eletrodomésticos","Assistência Técnica de Celulares e Notebooks","Manutenção de Elevadores","Manutenção Industrial","Chaveiro","Vidraceiro","Pintor Residencial / Comercial","Desentupidora / Dedetizadora","Jardinagem e Paisagismo"]},
{"sector":"Serviços - Recursos Humanos","subsectors":["Agência de Recrutamento e Seleção","Empresa de Treinamento e Desenvolvimento","Empresa de Benefícios Corporativos","Medicina e Segurança do Trabalho","Departamento Pessoal Terceirizado","Headhunter / Executive Search"]},
{"sector":"Serviços - Saúde e Bem-Estar","subsectors":["Clínica Médica","Clínica Odontológica","Clínica de Fisioterapia","Clínica de Estética","Clínica de Psicologia / Psiquiatria","Clínica de Fonoaudiologia","Clínica de Nutrição","Clínica Veterinária","Laboratório de Análises Clínicas","Farmácia de Manipulação","Hospital / Pronto-Socorro","Home Care / Cuidadores","Clínica de Acupuntura","Clínica de Quiropraxia","Clínica de Pilates e RPG","Ótica e Oftalmologia","Clínica de Dermatologia","Clínica de Ortopedia","Diversos"]},
{"sector":"Serviços - Segurança","subsectors":["Empresa de Vigilância e Segurança Patrimonial","Empresa de Segurança Eletrônica / CFTV","Empresa de Portaria e Controle de Acesso","Escolta Armada / Transporte de Valores","Consultoria em Segurança","Empresa de Alarmes e Monitoramento 24h"]},
{"sector":"Serviços - Seguros","subsectors":["Corretora de Seguros","Consórcio"]},
{"sector":"Serviços - Tecnologia e Digital","subsectors":["Desenvolvimento de Software / Sistemas","Agência de Marketing Digital","Design Gráfico e Branding","Consultoria de TI","Suporte Técnico e Helpdesk","Provedor de Internet","Empresa de Hospedagem / Data Center"]},
{"sector":"Serviços - Transporte e Logística","subsectors":["Transportadora de Cargas","Empresa de Mudanças","Serviço de Motoboy / Entregas Rápidas","Serviço de Courier / Encomendas","Fretamento de Ônibus e Vans","Táxi / Motorista de Aplicativo","Locadora de Veículos","Guincho e Reboque","Despachante de Trânsito / Documentação Veicular","Operador Logístico / Armazenagem","Agente de Cargas / Freight Forwarder","Empresa de Rastreamento Veicular"]},
{"sector":"Serviços Diversos","subsectors":["Coworking / Escritório Compartilhado","Estacionamento / Valet","Funerária e Serviços Memoriais","Empresa de Despacho Aduaneiro / Comércio Exterior","Empresa de Tradução e Interpretação","Empresa de Fotocópias / Impressão","Empresa de Aluguel de Equipamentos","Empresa de Aluguel de Roupas / Trajes","Empresa de Organização (Personal Organizer)","Cerimonialista / Wedding Planner"]},
{"sector":"Turismo e Hotelaria","subsectors":["Hotel / Pousada","Hostel","Resort","Motel","Airbnb / Aluguel por Temporada","Agência de Viagens e Turismo","Operadora de Turismo","Guia de Turismo","Parque Temático / Aquático","Ecoturismo e Turismo de Aventura","Turismo Rural"]}
]
$catalog$::jsonb;
  v_sector jsonb;
  v_subsector text;
  v_sector_id uuid;
  v_sector_order integer := 0;
  v_subsector_order integer;
begin
  for v_sector in select * from jsonb_array_elements(v_data)
  loop
    v_sector_order := v_sector_order + 1;

    insert into public.business_sectors (name, slug, is_active, display_order)
    values (
      v_sector->>'sector',
      public.slugify_business_catalog(v_sector->>'sector'),
      true,
      v_sector_order
    )
    on conflict (slug)
    do update set
      name = excluded.name,
      is_active = true,
      display_order = excluded.display_order
    returning id into v_sector_id;

    v_subsector_order := 0;
    for v_subsector in select jsonb_array_elements_text(v_sector->'subsectors')
    loop
      v_subsector_order := v_subsector_order + 1;

      insert into public.business_subsectors (sector_id, name, slug, is_active, display_order)
      values (
        v_sector_id,
        v_subsector,
        public.slugify_business_catalog(v_subsector),
        true,
        v_subsector_order
      )
      on conflict (sector_id, slug)
      do update set
        name = excluded.name,
        is_active = true,
        display_order = excluded.display_order;
    end loop;
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sector_id uuid;
  v_subsector_id uuid;
  v_sector_name text;
  v_subsector_name text;
begin
  if (new.raw_user_meta_data ->> 'sector_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_sector_id := (new.raw_user_meta_data ->> 'sector_id')::uuid;
  end if;

  if (new.raw_user_meta_data ->> 'subsector_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_subsector_id := (new.raw_user_meta_data ->> 'subsector_id')::uuid;
  end if;

  if v_subsector_id is not null and not exists (
    select 1 from public.business_subsectors bs where bs.id = v_subsector_id and bs.sector_id = v_sector_id
  ) then
    v_subsector_id := null;
  end if;

  select name into v_sector_name from public.business_sectors where id = v_sector_id;
  select name into v_subsector_name from public.business_subsectors where id = v_subsector_id;

  insert into public.profiles (
    id,
    email,
    full_name,
    company_name,
    segment,
    sector_id,
    subsector_id,
    employees_count,
    role,
    is_active
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    coalesce(new.raw_user_meta_data ->> 'segment', concat_ws(' - ', v_sector_name, v_subsector_name)),
    v_sector_id,
    v_subsector_id,
    case
      when (new.raw_user_meta_data ->> 'employees_count') ~ '^[0-9]+$'
        then (new.raw_user_meta_data ->> 'employees_count')::integer
      else null
    end,
    'client'::public.app_role,
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    company_name = coalesce(excluded.company_name, public.profiles.company_name),
    segment = coalesce(excluded.segment, public.profiles.segment),
    sector_id = coalesce(excluded.sector_id, public.profiles.sector_id),
    subsector_id = coalesce(excluded.subsector_id, public.profiles.subsector_id),
    employees_count = coalesce(excluded.employees_count, public.profiles.employees_count),
    updated_at = now();

  return new;
end;
$$;
