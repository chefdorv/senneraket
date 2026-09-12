-- 0002 — Qui a le droit de lire quoi.
--
-- Deux verrous indépendants protègent `contact_name`, `contact_email` et
-- `raw_message`, parce qu'un seul se contourne le jour où quelqu'un ajoute
-- une policy sans y penser :
--
--   1. les privilèges de colonne — le rôle `anon` n'a jamais reçu le droit de
--      lire ces colonnes, donc un `select *` échoue au lieu de les renvoyer ;
--   2. la RLS — `anon` ne voit que les lignes `status = 'published'`.
--
-- Recette du brief : « contact_email n'est accessible par aucune requête
-- anonyme ».

-- ---------------------------------------------------------------------------
-- L'équipe
-- ---------------------------------------------------------------------------

create table public.team_members (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'editor' check (role in ('editor', 'admin')),
  created_at  timestamptz not null default now()
);

comment on table public.team_members is
  'Les comptes autorisés au back-office. Être authentifié ne suffit pas : il '
  'faut figurer ici. Les lignes se créent à la main depuis le dashboard.';

-- `security definer` pour que la fonction lise `team_members` sans déclencher
-- la RLS de cette même table — sinon la policy s'appellerait elle-même.
create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m where m.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_team_member() from public;
grant execute on function public.is_team_member() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.venues       enable row level security;
alter table public.events       enable row level security;
alter table public.team_members enable row level security;

-- Rien par défaut : on repart de zéro avant de redonner colonne par colonne.
revoke all on public.venues       from anon, authenticated;
revoke all on public.events       from anon, authenticated;
revoke all on public.team_members from anon, authenticated;

-- --- team_members ----------------------------------------------------------

grant select on public.team_members to authenticated;

create policy "team_members: chacun voit l'équipe dont il fait partie"
  on public.team_members for select to authenticated
  using (public.is_team_member());

-- --- venues ----------------------------------------------------------------

-- Les lieux sont publics : ils s'affichent sur les fiches.
grant select on public.venues to anon, authenticated;
grant insert, update on public.venues to authenticated;

create policy "venues: lecture publique"
  on public.venues for select to anon, authenticated
  using (true);

create policy "venues: l'équipe crée"
  on public.venues for insert to authenticated
  with check (public.is_team_member());

create policy "venues: l'équipe modifie"
  on public.venues for update to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

-- --- events ----------------------------------------------------------------

-- Verrou 1 : la liste blanche des colonnes publiables. `contact_name`,
-- `contact_email`, `raw_message`, `rejection_reason`, `status` et `source`
-- en sont absents, et doivent le rester.
grant select (
  id, slug, date, time_label, starts_at,
  venue_id, venue_raw,
  title, genres, price,
  ticket_url, fb_url, collective_url,
  description, poster_path
) on public.events to anon;

-- Verrou 2 : et seulement les lignes publiées.
create policy "events: lecture publique des fiches publiées"
  on public.events for select to anon
  using (status = 'published');

-- L'équipe voit et manipule tout. Une insertion publique ne passe pas par
-- ici : elle passe par le serveur Next.js, qui force `status = 'pending'` et
-- `source = 'form'`. Aucune policy d'insertion n'est donnée à `anon`, donc
-- une proposition ne peut pas naître publiée.
grant select, insert, update, delete on public.events to authenticated;

create policy "events: l'équipe lit tout"
  on public.events for select to authenticated
  using (public.is_team_member());

create policy "events: l'équipe crée"
  on public.events for insert to authenticated
  with check (public.is_team_member());

create policy "events: l'équipe modifie"
  on public.events for update to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "events: l'équipe supprime"
  on public.events for delete to authenticated
  using (public.is_team_member());

-- ---------------------------------------------------------------------------
-- La vue que lit le site public
-- ---------------------------------------------------------------------------

-- `security_invoker = on` : la vue s'exécute avec les droits de l'appelant,
-- donc les deux verrous ci-dessus s'appliquent à travers elle. Une vue en
-- `security definer` les court-circuiterait — c'est le piège classique, et
-- l'advisor Supabase le signale.
create view public.public_events
with (security_invoker = on)
as
select
  e.id,
  e.slug,
  e.date,
  e.time_label,
  e.starts_at,
  e.venue_raw,
  v.name    as venue_name,
  v.address as venue_address,
  v.city    as venue_city,
  v.url     as venue_url,
  e.title,
  e.genres,
  e.price,
  e.ticket_url,
  e.fb_url,
  e.collective_url,
  e.description,
  e.poster_path
from public.events e
left join public.venues v on v.id = e.venue_id
where e.status = 'published';

grant select on public.public_events to anon, authenticated;

comment on view public.public_events is
  'La seule porte d''entrée du site public. Ne jamais y ajouter une colonne '
  'de contact ni le message d''origine.';
