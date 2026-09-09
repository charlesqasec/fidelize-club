-- Fidelize.club — extensões e funções auxiliares reutilizadas por todas as
-- migrations seguintes. Nada aqui cria tabelas de negócio.

-- gen_random_uuid() e gen_random_bytes() (tokens públicos, ex.: customer_cards).
-- Instalada em `public` (não em `extensions`) deliberadamente: assim
-- funções como gen_random_uuid()/gen_random_bytes() ficam resolvíveis sem
-- depender do search_path configurado no projeto Supabase de destino.
create extension if not exists pgcrypto with schema public;

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Mantém a coluna updated_at sincronizada em qualquer UPDATE. Aplicar via trigger BEFORE UPDATE.';

-- ---------------------------------------------------------------------------
-- Tabelas append-only (ledger, auditoria): bloqueia UPDATE/DELETE mesmo para
-- quem tiver GRANT na tabela. A imutabilidade é uma garantia do schema, não
-- apenas uma convenção de aplicação.
-- ---------------------------------------------------------------------------
create function public.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% é somente-inserção; % não é permitido', tg_table_name, tg_op;
end;
$$;

comment on function public.forbid_mutation() is
  'Bloqueia UPDATE/DELETE em tabelas append-only (ledger, audit_logs). Aplicar via trigger BEFORE UPDATE OR DELETE.';

-- ---------------------------------------------------------------------------
-- Integridade multi-tenant: garante que, quando uma linha referencia
-- organization_id e location_id ao mesmo tempo, a location realmente
-- pertence àquela organização. Isso complementa o RLS — RLS controla QUEM
-- pode agir, isto impede um vínculo cruzado entre tenants mesmo por engano
-- (ex.: bug de aplicação, script administrativo, service_role).
-- ---------------------------------------------------------------------------
create function public.check_location_belongs_to_org()
returns trigger
language plpgsql
as $$
begin
  if new.location_id is not null then
    if not exists (
      select 1 from public.locations l
      where l.id = new.location_id
        and l.organization_id = new.organization_id
    ) then
      raise exception 'location_id % não pertence à organization_id %', new.location_id, new.organization_id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.check_location_belongs_to_org() is
  'Valida que location_id pertence à mesma organization_id da linha. Aplicar via trigger BEFORE INSERT OR UPDATE em tabelas com ambas as colunas.';
