# senneraket

Site statique publié par GitHub Pages sur **https://tekarennes.dooka.fr**.

Pas de build, pas de dépendance : `index.html` porte son propre CSS, et
un `git push` sur `main` suffit à publier (compter 1 à 2 minutes).

## Ne pas indexer

Deux garde-fous, à conserver ensemble tant que le site n'est pas
officiellement ouvert :

- la balise `<meta name="robots" content="noindex, nofollow">` dans
  `index.html` et `404.html` ;
- le `Disallow: /` de `robots.txt`.

Pour ouvrir le site aux moteurs de recherche plus tard, il faudra
retirer les deux.

## Fichiers de service

- `CNAME` — le domaine personnalisé servi par GitHub Pages. Ne pas le
  supprimer : Pages le réécrit à chaque changement de domaine dans les
  réglages du dépôt.
- `.nojekyll` — désactive Jekyll, qui ignorerait les fichiers et
  dossiers commençant par un `_`.
- `404.html` — page d'erreur servie par Pages sur les URL inconnues.

## DNS

Enregistrement `CNAME` chez OVH : `tekarennes` → `chefdorv.github.io.`
