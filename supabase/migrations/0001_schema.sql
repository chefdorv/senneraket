-- 0001 — Le schéma de l'agenda : les lieux, les événements, et ce qui se
-- déduit tout seul (le slug d'URL et l'instant de tri).
--
-- Référence : docs/brief.md §4. Les écarts avec le tableau du brief sont
-- signalés en commentaire là où ils se produisent, jamais silencieux.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Énumérations
-- ---------------------------------------------------------------------------

-- draft → pending → published
--               → incomplete (relance envoyée)
--               → rejected   (motif obligatoire)
create type public.event_status as enum (
  'draft',
  'pending',
  'published',
  'incomplete',
  'rejected'
);

-- `dm` est prévu dès maintenant bien que rien ne l'alimente : ajouter une
-- valeur à un enum plus tard forcerait une migration sur une table vivante.
create type public.event_source as enum ('form', 'mail', 'dm', 'manual');

-- ---------------------------------------------------------------------------
-- Lieux
-- ---------------------------------------------------------------------------

create table public.venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  -- Orthographes alternatives, pour reconnaître « penny lane » ou « la penny »
  -- dans un message brut.
  aliases     text[] not null default '{}',
  address     text,
  city        text not null default 'Rennes',
  url         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.venues is
  'Les lieux référencés. Table à part et non champ texte libre : elle porte '
  'le dédoublonnage, le filtrage géographique et le pré-remplissage.';

-- ---------------------------------------------------------------------------
-- Fabrique de slugs
-- ---------------------------------------------------------------------------

-- Doit produire exactement le même résultat que `makeSlug()` dans
-- web/src/lib/events.ts, sinon les URLs déjà partagées changeraient au moment
-- où les données passent des fixtures à la base.
create or replace function public.slugify(value text)
returns text
language sql
stable
set search_path = ''
as $$
  select rtrim(
    left(
      btrim(
        regexp_replace(lower(extensions.unaccent(value)), '[^a-z0-9]+', '-', 'g'),
        '-'
      ),
      60
    ),
    '-'
  );
$$;

-- ---------------------------------------------------------------------------
-- Rang horaire
-- ---------------------------------------------------------------------------

-- Minutes depuis minuit lues dans un libellé libre (`22H-3H`, `21H00-00H30`).
-- NULL si le libellé est absent ou illisible : un horaire inconnu se range en
-- fin de journée, il ne s'invente pas.
create or replace function public.parse_start_minutes(label text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when m is null then null
    when m[1]::int > 23 then null
    when coalesce(m[2], '0')::int > 59 then null
    else m[1]::int * 60 + coalesce(m[2], '0')::int
  end
  from regexp_match(coalesce(label, ''), '(\d{1,2})\s*[Hh]\s*(\d{2})?') as m;
$$;

-- ---------------------------------------------------------------------------
-- Événements
-- ---------------------------------------------------------------------------

create table public.events (
  id                uuid primary key default gen_random_uuid(),

  -- Segment d'URL de la fiche. Rempli par trigger si absent, jamais modifié
  -- ensuite : un lien partagé doit continuer de fonctionner même si le titre
  -- est corrigé en relecture.
  slug              text not null unique,

  date              date not null,

  -- Le brief marque `time_label` obligatoire, mais la maquette et la recette
  -- imposent toutes deux de rester lisible sans horaire (« horaire à venir »,
  -- « Non communiqués »). La colonne est donc nullable, et le formulaire
  -- public garde le champ obligatoire à la saisie.
  time_label        text,

  -- Dérivé de `date` + `time_label`, pour le tri. Ne jamais l'écrire à la
  -- main : le trigger l'écrase.
  starts_at         timestamptz,

  venue_id          uuid references public.venues (id) on delete restrict,
  -- Ce qu'a écrit l'organisateur quand le lieu n'a pas été reconnu. Une
  -- soumission arrive donc sans `venue_id` — d'où la colonne nullable, avec
  -- la contrainte de publication plus bas pour compenser.
  venue_raw         text,

  title             text not null check (btrim(title) <> ''),
  genres            text not null default '',
  price             text,
  ticket_url        text,
  fb_url            text,
  collective_url    text,
  description       text,
  poster_path       text,

  -- Jamais publiées. Aucun rôle anonyme n'a le droit de les lire (0002).
  contact_name      text,
  contact_email     text,
  raw_message       text not null default '',

  status            public.event_status not null default 'pending',
  source            public.event_source not null default 'form',
  rights_ok         boolean not null default false,
  rejection_reason  text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Un événement se rattache à un lieu, reconnu ou au moins nommé.
  constraint events_needs_some_venue
    check (venue_id is not null or btrim(coalesce(venue_raw, '')) <> ''),

  -- Ce qu'être publié exige. Ces trois contraintes sont le dernier filet
  -- derrière le back-office : une fiche incomplète ne peut pas devenir
  -- publique par un UPDATE distrait.
  constraint events_published_needs_venue
    check (status <> 'published' or venue_id is not null),
  constraint events_published_needs_genres
    check (status <> 'published' or btrim(genres) <> ''),
  constraint events_published_needs_rights
    check (status <> 'published' or rights_ok),

  -- Un refus se motive, sinon on ne sait pas quoi répondre à l'organisateur.
  constraint events_rejected_needs_reason
    check (status <> 'rejected' or btrim(coalesce(rejection_reason, '')) <> ''),

  -- Une soumission venue de l'extérieur laisse toujours de quoi répondre.
  -- Une saisie faite par l'équipe (`manual`) n'y est pas tenue.
  constraint events_external_needs_contact
    check (
      source not in ('form', 'mail')
      or (btrim(coalesce(contact_name, '')) <> ''
          and btrim(coalesce(contact_email, '')) <> '')
    )
);

comment on column public.events.starts_at is
  'Dérivé par trigger. Une soirée qui démarre avant 6 h est la fin de la nuit '
  'du jour indiqué, pas le début de sa matinée : elle est décalée de 24 h '
  'pour ne pas passer devant l''apéro de 18 h dans la liste.';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.events_set_derived()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  minutes  integer;
  base     text;
  candidate text;
  suffix   integer := 1;
begin
  -- Rang horaire.
  minutes := public.parse_start_minutes(new.time_label);
  if minutes is null then
    new.starts_at := null;
  else
    if minutes < 360 then
      minutes := minutes + 1440;
    end if;
    new.starts_at :=
      (new.date::timestamp + make_interval(mins => minutes))
      at time zone 'Europe/Paris';
  end if;

  -- Slug : calculé une seule fois, à la création.
  if tg_op = 'INSERT' and btrim(coalesce(new.slug, '')) = '' then
    base := public.slugify(new.title);
    if base = '' then
      base := 'date';
    end if;
    candidate := base || '-' || to_char(new.date, 'YYYY-MM-DD');
    -- Deux soirées de même intitulé le même jour, ça arrive (deux salles,
    -- une résidence). On suffixe plutôt que de refuser l'insertion.
    while exists (select 1 from public.events e where e.slug = candidate) loop
      suffix := suffix + 1;
      candidate := base || '-' || to_char(new.date, 'YYYY-MM-DD') || '-' || suffix;
    end loop;
    new.slug := candidate;
  elsif tg_op = 'UPDATE' then
    new.slug := old.slug;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger events_set_derived
  before insert or update on public.events
  for each row execute function public.events_set_derived();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger venues_touch_updated_at
  before update on public.venues
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------

-- La requête du site public : une semaine de fiches publiées, dans l'ordre.
create index events_published_idx
  on public.events (date, starts_at nulls last)
  where status = 'published';

-- La file de relecture du back-office.
create index events_queue_idx
  on public.events (status, date);

-- Détection de doublon : même jour, même lieu. Volontairement NON unique —
-- une salle peut accueillir deux choses le même jour (un après-midi et une
-- nuit). C'est au relecteur de trancher entre fusionner et garder les deux.
create index events_duplicate_idx
  on public.events (date, venue_id);
