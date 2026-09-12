# senneraket

Agenda des concerts et soirées de Rennes — base d'événements, site
public, back-office de validation.

Le cadrage est dans [docs/brief.md](docs/brief.md), les conventions de
travail dans [CLAUDE.md](CLAUDE.md).

## Structure

- `docs/` — le brief de cadrage
- `maquette/` — la maquette de référence du site public, autonome
- `supabase/migrations/` — schéma et politiques d'accès
- `web/` — l'application Next.js

## Site publié

**https://tekarennes.dooka.fr** sert pour l'instant une simple page
d'attente (`index.html`), via GitHub Pages depuis la racine de `main`.
L'application n'est pas encore déployée.

### Ne pas indexer

Deux garde-fous, à conserver ensemble tant que le site n'est pas
officiellement ouvert :

- la balise `<meta name="robots" content="noindex, nofollow">`, présente
  dans `index.html`, `404.html` et les pages de l'app ;
- le `Disallow: /` de `robots.txt`.

Pour ouvrir le site aux moteurs de recherche, il faudra retirer les
deux, plus le `robots` du `metadata` de `web/src/app/layout.tsx`.

### Fichiers de service

- `CNAME` — le domaine personnalisé servi par GitHub Pages. Ne pas le
  supprimer tant que Pages sert le domaine : Pages le réécrit à chaque
  changement de domaine dans les réglages du dépôt.
- `.nojekyll` — désactive Jekyll, qui ignorerait les fichiers et
  dossiers commençant par un `_`.
- `404.html` — page d'erreur servie par Pages sur les URL inconnues.

## DNS

Enregistrement `CNAME` chez OVH : `tekarennes` → `chefdorv.github.io.`
