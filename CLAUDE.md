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
supabase/migrations/       schéma et RLS, numérotés 0001, 0002…
web/                       l'application Next.js
  src/app/                 routes (App Router)
  src/components/          composants
  src/lib/                 dates, modèle, accès aux données
index.html, CNAME,         page d'attente servie par GitHub Pages,
.nojekyll, robots.txt      temporaire — voir « Hébergement »
```

## Commandes

Depuis `web/` :

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npx tsc --noEmit` — vérification de types
- `npx eslint .` — linter

## Hébergement

Situation transitoire, à ne pas prendre pour une cible :
`tekarennes.dooka.fr` est pour l'instant servi par **GitHub Pages**
depuis la racine du dépôt (`index.html`), qui n'affiche qu'une page
d'attente. L'app Next.js vit dans `web/` et n'est pas encore déployée.

Au premier déploiement Vercel, il faudra : basculer l'enregistrement
CNAME chez OVH de `chefdorv.github.io.` vers la cible Vercel, désactiver
GitHub Pages, et supprimer `index.html`, `404.html`, `CNAME` et
`.nojekyll` de la racine.

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
