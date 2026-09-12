-- Suivi des migrations appliquées.
--
-- Sans cette table, rien en base ne dit quelles migrations sont passées : la
-- seule trace est le fait que les tables existent, ce qui ne distingue pas
-- « appliquée » de « appliquée puis modifiée dans le fichier ». Deux pièges
-- concrets que ça referme :
--   - rejouer une migration déjà passée, et défaire au passage ce qu'une
--     migration suivante avait corrigé ;
--   - modifier un fichier déjà appliqué en croyant que la base suivra — elle
--     ne suit pas, et l'écart reste invisible jusqu'au jour où on reconstruit.
--
-- D'où l'empreinte : on enregistre le SHA-256 du fichier au moment où il
-- passe. Une empreinte qui ne correspond plus est une erreur bloquante, pas
-- un avertissement.
--
-- Le schéma s'appelle `migrations` et non `public` volontairement : Supabase
-- n'expose que `public` via PostgREST, donc cette table est hors de portée de
-- l'API, sans avoir à écrire une seule policy.
--
-- Appliquée automatiquement en premier par `npm run db:migrate`, et
-- idempotente : on peut la rejouer sans effet.

create schema if not exists migrations;

create table if not exists migrations.applied (
  filename text primary key,
  -- SHA-256 du contenu du fichier tel qu'appliqué.
  checksum text not null,
  applied_at timestamptz not null default now(),
  applied_by text not null default current_user
);

comment on table migrations.applied is
  'Une ligne par migration appliquée, avec l''empreinte du fichier. Ne jamais éditer à la main : c''est le journal qui dit ce que la base a réellement subi.';

-- Personne d'autre que le propriétaire n'a affaire à ce schéma.
revoke all on schema migrations from anon, authenticated;
revoke all on all tables in schema migrations from anon, authenticated;

-- Enregistrement d'une migration, avec le contrôle d'empreinte. Le script
-- `supabase/apply.mjs` fait déjà cette vérification avant d'appliquer un
-- fichier ; cette fonction la refait côté base, pour que la règle tienne aussi
-- quand quelqu'un applique une migration à la main dans le SQL Editor.
--
-- Renvoie true si la migration a été enregistrée (donc à appliquer), false si
-- elle l'était déjà à l'identique (donc à sauter). Lève si l'empreinte a
-- changé.
create or replace function migrations.record(p_filename text, p_checksum text)
returns boolean
language plpgsql
as $$
declare
  known text;
begin
  select checksum into known from migrations.applied where filename = p_filename;

  if known is null then
    insert into migrations.applied (filename, checksum) values (p_filename, p_checksum);
    return true;
  end if;

  if known <> p_checksum then
    raise exception
      'La migration % a déjà été appliquée avec un contenu différent (empreinte en base %, fichier %). Ne pas modifier une migration déjà passée : en écrire une nouvelle.',
      p_filename, left(known, 12), left(p_checksum, 12)
      using errcode = '22023';
  end if;

  return false;
end;
$$;
