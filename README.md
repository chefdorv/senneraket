# senneraket

Agenda des concerts et soirées de Rennes — base d'événements, site
public, back-office de validation.

Le cadrage est dans [docs/brief.md](docs/brief.md), les conventions de
travail dans [CLAUDE.md](CLAUDE.md).

## Structure

- `docs/` — le brief de cadrage
- `maquette/` — la maquette de référence du site public, autonome
- `supabase/` — schéma, politiques d'accès, et le script qui les applique
- `web/` — l'application Next.js

## Base de données

Copier `.env.example` en `.env` et y mettre la connection string du
projet Supabase, puis :

```
npm install
npm run db:status    # où en est la base, sans rien appliquer
npm run db:migrate   # applique les migrations en attente
```

## Site publié

**https://tekarennes.dooka.fr** sert la maquette, sur des données figées
— aucune base n'existe encore, et le formulaire n'enregistre rien.

Le site est construit en fichiers statiques puis déposé sur GitHub Pages
par `.github/workflows/pages.yml`, à chaque poussée sur `main` touchant
`web/`. La branche ne contient que des sources.

### Ne pas indexer

Deux garde-fous, à conserver ensemble tant que le site n'est pas
officiellement ouvert :

- la balise `<meta name="robots" content="noindex, nofollow">`, présente
  dans `index.html`, `404.html` et les pages de l'app ;
- le `Disallow: /` de `robots.txt`.

Pour ouvrir le site aux moteurs de recherche, il faudra retirer les
deux : le `robots` du `metadata` de `web/src/app/layout.tsx`, et le
`Disallow` de `web/public/robots.txt`.

### Fichiers de service

Ils vivent dans `web/public/`, donc se retrouvent à la racine du site
publié :

- `CNAME` — le domaine personnalisé. Ne pas le supprimer.
- `.nojekyll` — empêche tout traitement Jekyll, qui ignorerait le
  dossier `_next/`.
- `robots.txt` — le `Disallow: /` ci-dessus.

## DNS

Enregistrement `CNAME` chez OVH : `tekarennes` → `chefdorv.github.io.`
