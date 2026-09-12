# Tek a Rennes — l'agenda

## Description

Agenda des concerts et soirées de Rennes. Un compte Instagram publie la
liste chaque semaine ; le projet remplace la saisie manuelle par une base
d'événements, un site public, un back-office de validation et un export
pour le montage du visuel.

**Principe directeur : rien n'est publié sans validation humaine.**
L'automatisation porte sur la saisie et la mise en forme, jamais sur la
décision éditoriale. Le comportement par défaut, si personne ne valide,
est de ne rien publier.

Le cadrage complet est dans [docs/brief.md](docs/brief.md) — c'est la
source de vérité du périmètre et des règles métier. La maquette de
référence du site public est [maquette/site.html](maquette/site.html),
autonome et ouvrable directement dans un navigateur.

## Nom du dépôt

Le dépôt s'appelle `senneraket` — `tekarennes` écrit à l'envers. Il est
public, et le nom est opaque volontairement pour qu'on ne remonte pas au
projet depuis GitHub. Ne pas le renommer, ne pas remplir la description
du dépôt, ne pas ajouter de topics.

## Stack

- Next.js 16 (App Router) + TypeScript, dans `web/`
- Supabase — Postgres, auth de l'équipe, stockage des affiches
- Déploiement visé : Vercel
- CSS écrit à la main dans `web/src/app/globals.css`, pas de framework

Contrainte forte : **tout doit tenir dans les paliers gratuits**, budget
cible sous 6 €/mois hors nom de domaine. Ne pas introduire de dépendance
payante sans le signaler.

## Structure

```
docs/brief.md              cadrage, source de vérité
maquette/site.html         maquette de référence, autonome
supabase/                  migrations et runner, rien d'appliqué
web/                       l'application Next.js
  public/                  CNAME, robots.txt, .nojekyll
  src/app/                 routes (App Router)
  src/components/          composants
  src/lib/                 dates, modèle, accès aux données
.github/workflows/         construction et dépôt sur GitHub Pages
```

## Commandes

Depuis `web/` :

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npx tsc --noEmit` — vérification de types
- `npx eslint .` — linter

Depuis la racine :

- `npm run db:status` — où en est la base, sans rien appliquer
- `npm run db:migrate` — applique les migrations en attente

## Base de données

**Rien n'existe encore, et c'est volontaire.** Décision du 2026-09-12 :
le site reste une maquette sur données figées tant qu'il n'y a pas de
besoin réel. Les migrations sont écrites et prêtes, mais aucune base
n'est créée. Ne pas en créer une sans feu vert explicite.

Quand le moment viendra, le projet Supabase ira sur le compte qui
héberge déjà Quali. **Le
connecteur Supabase de claude.ai ne l'atteint pas** — il est rattaché à
l'autre compte, celui de l'organisation Dooka, et répond « You do not
have permission ». Ne pas perdre de temps à réessayer par là.

Le SQL s'applique donc avec `npm run db:migrate` (`supabase/apply.mjs`,
seule dépendance `pg`). La machine n'a ni `psql`, ni Homebrew, ni la CLI
Supabase, ni Docker — c'est la raison du script maison.

La connection string vit dans `.env` à la racine, sous `TEKA_DB_URL`
(voir `.env.example`). Le fichier est ignoré par git.

Trois choses à savoir avant de toucher au schéma :

- Le fichier appliqué et son enregistrement passent dans **la même
  transaction**. Une migration ne peut pas être à moitié appliquée.
- Modifier une migration déjà appliquée est **bloqué** par un contrôle
  d'empreinte SHA-256, des deux côtés : dans le script et dans
  `migrations.record()`. La correction se fait par une nouvelle
  migration, jamais en éditant l'ancienne.
- `--file <chemin.sql>` exécute un fichier sans l'enregistrer, pour les
  scripts de vérification qui finissent par un rollback.

## Hébergement

`tekarennes.dooka.fr` sert la maquette, en **fichiers écrits d'avance**
(`output: 'export'`), déposés sur **GitHub Pages** par le workflow
`.github/workflows/pages.yml`. La branche `main` ne contient que des
sources : aucune sortie de build n'y est commitée.

Le réglage Settings > Pages > Source doit rester sur **GitHub Actions**.
S'il repasse sur « Deploy from a branch », Pages reconstruit la racine du
dépôt avec Jekyll et sert le README à la place du site — c'est arrivé une
fois. Changer ce réglage **efface aussi le domaine personnalisé**, à
remettre juste après.

### Ce que l'export statique coûte

Sans serveur d'application, trois choses sont dégradées. Elles reviennent
telles quelles en retirant `output` de `next.config.ts` :

- Le formulaire valide côté client et n'envoie rien. L'écran de
  confirmation le dit explicitement, pour ne pas tromper quelqu'un qui
  le remplirait pour de bon.
- La page d'accueil est figée sur la semaine du build : elle ne bascule
  pas toute seule le lundi matin.
- La navigation entre semaines est bornée à la plage pré-générée
  (`src/lib/weeks.ts`), et une URL de semaine qui ne tombe pas un lundi
  renvoie une 404 au lieu d'être redirigée.

## Conventions

- TypeScript strict, pas de `any`
- Composants fonctionnels ; serveur par défaut, `'use client'` seulement
  quand l'interactivité l'impose
- Fichiers composants : `web/src/components/NomDuComposant.tsx`
- Commentaires et libellés en français
- Un commit par élément fonctionnel testé

### Direction artistique

Thème unique assumé, pas de variante claire. Fond noir, **un seul**
accent jaune `#ebf54f`, filets jaunes de 2 px, titres en Unbounded et
texte en Archivo. Les conventions d'écriture viennent du compte
existant et ne se négocient pas : noms de lieux en capitales, genres en
minuscules entre parenthèses à la fin de la ligne, entrée gratuite mise
en avant par `// GRATUIT` en jaune.

### Champs manquants

Le sujet du produit, c'est que les organisateurs envoient des fiches
incomplètes. Un champ absent **s'affiche comme absent** — « Non
communiqué », « horaire à venir » — il ne fait pas disparaître la ligne.
Un tarif vide n'est pas une gratuité.

### Données

`web/src/lib/repository.ts` est la seule couture entre les pages et les
données. Elle lit aujourd'hui `fixtures.ts` (les données de la maquette,
figées sur la semaine du 27 juin 2026) et lira demain la vue
`public_events` de Supabase. Les pages ne doivent pas savoir laquelle
des deux répond.

Tant que les fixtures sont en place, `DEMO_TODAY` dans `web/.env.local`
place le site sur cette semaine-là. Cette variable et `fixtures.ts`
disparaissent ensemble.

## Écarts assumés avec le brief

À relire avant de « corriger » le schéma :

- `events.time_label` est **nullable**, alors que le brief le marque
  obligatoire. La maquette et la recette exigent toutes deux qu'une
  fiche sans horaire reste lisible. Le champ reste obligatoire dans le
  formulaire public.
- `events.venue_id` est **nullable** : une soumission dont le lieu n'est
  pas reconnu arrive avec `venue_raw` seul. Une contrainte impose le
  `venue_id` au moment de passer `published`.
- `events.contact_name` / `contact_email` ne sont exigés que pour les
  sources `form` et `mail` — une saisie faite par l'équipe n'a personne
  à recontacter.
- Le couple (`date`, `venue_id`) porte un index **non unique**. Une
  salle peut accueillir deux choses le même jour ; le doublon se
  signale au relecteur, il ne se refuse pas en base.
