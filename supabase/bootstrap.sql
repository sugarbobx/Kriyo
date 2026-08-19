-- Kriyo Supabase bootstrap.
-- Apply this in the Supabase SQL editor or via psql for the initial schema and RLS baseline.

begin;

create extension if not exists "pgcrypto";

create table if not exists public."User" (
  id text primary key,
  email text not null unique,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."ProfilRisque" (
  id text primary key,
  type text not null unique,
  "dailyDD" double precision null,
  "maxDD" double precision null,
  "plafondTP" double precision null
);

create table if not exists public."CompteProp" (
  id text primary key,
  "userId" text not null references public."User"(id) on delete cascade,
  nom text not null,
  capital double precision not null,
  "typePayout" text not null,
  "profilRisqueId" text not null references public."ProfilRisque"(id) on delete restrict,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Trade" (
  id text primary key,
  "comptePropId" text not null references public."CompteProp"(id) on delete cascade,
  "scoreVR" integer not null,
  "scoreEP" integer not null,
  "scoreVP" integer not null,
  "scoreTotal" integer not null,
  "riskReward" double precision null,
  pnl double precision null,
  statut text not null,
  "dateOuverture" timestamptz not null default now(),
  "dateCloture" timestamptz null
);

create table if not exists public."ValidationSas" (
  id text primary key,
  "userId" text not null references public."User"(id) on delete cascade,
  tension boolean not null,
  ecran boolean not null,
  telephone boolean not null,
  macro boolean not null,
  alignement boolean not null,
  valide boolean not null,
  "dateValidation" timestamptz not null default now()
);

create table if not exists public."Session" (
  id text primary key,
  "userId" text not null references public."User"(id) on delete cascade,
  "dateDebut" timestamptz not null default now(),
  "dateFin" timestamptz null
);

create index if not exists "CompteProp_userId_idx" on public."CompteProp" ("userId");
create index if not exists "CompteProp_profilRisqueId_idx" on public."CompteProp" ("profilRisqueId");
create index if not exists "Trade_comptePropId_idx" on public."Trade" ("comptePropId");
create index if not exists "ValidationSas_userId_idx" on public."ValidationSas" ("userId");
create index if not exists "Session_userId_idx" on public."Session" ("userId");

alter table public."User" enable row level security;
alter table public."ProfilRisque" enable row level security;
alter table public."CompteProp" enable row level security;
alter table public."Trade" enable row level security;
alter table public."ValidationSas" enable row level security;
alter table public."Session" enable row level security;

drop policy if exists "user_self_read" on public."User";
create policy "user_self_read"
  on public."User"
  for select
  using (id = auth.uid()::text);

drop policy if exists "user_self_write" on public."User";
create policy "user_self_write"
  on public."User"
  for insert
  with check (id = auth.uid()::text);

drop policy if exists "user_self_update" on public."User";
create policy "user_self_update"
  on public."User"
  for update
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

drop policy if exists "user_self_delete" on public."User";
create policy "user_self_delete"
  on public."User"
  for delete
  using (id = auth.uid()::text);

drop policy if exists "profilrisque_public_read" on public."ProfilRisque";
create policy "profilrisque_public_read"
  on public."ProfilRisque"
  for select
  using (true);

drop policy if exists "compteprop_self_read" on public."CompteProp";
create policy "compteprop_self_read"
  on public."CompteProp"
  for select
  using ("userId" = auth.uid()::text);

drop policy if exists "compteprop_self_write" on public."CompteProp";
create policy "compteprop_self_write"
  on public."CompteProp"
  for insert
  with check ("userId" = auth.uid()::text);

drop policy if exists "compteprop_self_update" on public."CompteProp";
create policy "compteprop_self_update"
  on public."CompteProp"
  for update
  using ("userId" = auth.uid()::text)
  with check ("userId" = auth.uid()::text);

drop policy if exists "compteprop_self_delete" on public."CompteProp";
create policy "compteprop_self_delete"
  on public."CompteProp"
  for delete
  using ("userId" = auth.uid()::text);

drop policy if exists "trade_self_read" on public."Trade";
create policy "trade_self_read"
  on public."Trade"
  for select
  using (
    exists (
      select 1
      from public."CompteProp" compte_prop
      where compte_prop.id = "comptePropId"
        and compte_prop."userId" = auth.uid()::text
    )
  );

drop policy if exists "trade_self_write" on public."Trade";
create policy "trade_self_write"
  on public."Trade"
  for insert
  with check (
    exists (
      select 1
      from public."CompteProp" compte_prop
      where compte_prop.id = "comptePropId"
        and compte_prop."userId" = auth.uid()::text
    )
  );

drop policy if exists "trade_self_update" on public."Trade";
create policy "trade_self_update"
  on public."Trade"
  for update
  using (
    exists (
      select 1
      from public."CompteProp" compte_prop
      where compte_prop.id = "comptePropId"
        and compte_prop."userId" = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1
      from public."CompteProp" compte_prop
      where compte_prop.id = "comptePropId"
        and compte_prop."userId" = auth.uid()::text
    )
  );

drop policy if exists "trade_self_delete" on public."Trade";
create policy "trade_self_delete"
  on public."Trade"
  for delete
  using (
    exists (
      select 1
      from public."CompteProp" compte_prop
      where compte_prop.id = "comptePropId"
        and compte_prop."userId" = auth.uid()::text
    )
  );

drop policy if exists "validation_self_read" on public."ValidationSas";
create policy "validation_self_read"
  on public."ValidationSas"
  for select
  using ("userId" = auth.uid()::text);

drop policy if exists "validation_self_write" on public."ValidationSas";
create policy "validation_self_write"
  on public."ValidationSas"
  for insert
  with check ("userId" = auth.uid()::text);

drop policy if exists "validation_self_update" on public."ValidationSas";
create policy "validation_self_update"
  on public."ValidationSas"
  for update
  using ("userId" = auth.uid()::text)
  with check ("userId" = auth.uid()::text);

drop policy if exists "validation_self_delete" on public."ValidationSas";
create policy "validation_self_delete"
  on public."ValidationSas"
  for delete
  using ("userId" = auth.uid()::text);

drop policy if exists "session_self_read" on public."Session";
create policy "session_self_read"
  on public."Session"
  for select
  using ("userId" = auth.uid()::text);

drop policy if exists "session_self_write" on public."Session";
create policy "session_self_write"
  on public."Session"
  for insert
  with check ("userId" = auth.uid()::text);

drop policy if exists "session_self_update" on public."Session";
create policy "session_self_update"
  on public."Session"
  for update
  using ("userId" = auth.uid()::text)
  with check ("userId" = auth.uid()::text);

drop policy if exists "session_self_delete" on public."Session";
create policy "session_self_delete"
  on public."Session"
  for delete
  using ("userId" = auth.uid()::text);

commit;
