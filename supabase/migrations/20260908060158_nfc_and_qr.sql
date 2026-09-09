-- Fidelize.club — dispositivos NFC e tokens QR (canais de entrada).
--
-- IMPORTANTE (docs/ARQUITETURA.md, seção 16.2): estas tabelas identificam o
-- dispositivo/token físico, mas NUNCA são, sozinhas, prova suficiente de
-- visita. A URL/tag NFC não credita ponto por si só — quem decide isso é o
-- motor antifraude futuro (ETAPA 10), a partir de um checkin_event.

create table public.nfc_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  public_identifier text not null unique,
  secret_hash text not null,
  secret_version integer not null default 1,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.nfc_devices is
  'Placa NFC física de uma unidade. secret_hash guarda apenas o hash do segredo gravado na tag — nunca o valor em claro.';

create trigger set_updated_at
  before update on public.nfc_devices
  for each row execute function public.set_updated_at();

create trigger check_location_org
  before insert or update on public.nfc_devices
  for each row execute function public.check_location_belongs_to_org();

create index nfc_devices_organization_id_idx on public.nfc_devices (organization_id);
create index nfc_devices_location_id_idx on public.nfc_devices (location_id);

-- ---------------------------------------------------------------------------
create table public.qr_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  token text not null unique,
  type text not null check (type in ('STATIC', 'DYNAMIC', 'SINGLE_USE')),
  expires_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXPIRED', 'REVOKED')),
  created_at timestamptz not null default now()
);

comment on table public.qr_tokens is
  'Token de QR Code de uma unidade. type SINGLE_USE + usage_limit=1 cobre o caso de um QR impresso por comanda.';

create trigger check_location_org
  before insert or update on public.qr_tokens
  for each row execute function public.check_location_belongs_to_org();

create index qr_tokens_organization_id_idx on public.qr_tokens (organization_id);
create index qr_tokens_location_id_idx on public.qr_tokens (location_id);
