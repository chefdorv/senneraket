# Brief — Agenda Tek a Rennes

> Document de cadrage établi en amont du projet. Source de vérité pour
> le périmètre et les règles métier. La maquette de référence est
> `maquette/site.html`.

---

## 1. Contexte

Un compte Instagram rennais publie chaque semaine la liste des concerts et soirées de la ville.
Aujourd'hui tout est manuel : les organisateurs envoient leurs événements par DM Instagram ou par
mail, une personne recopie les infos et monte un visuel sur Canva. Cette personne passe le flambeau.

Le projet consiste à construire la base d'événements et le site public qui vont la remplacer.
**La collecte automatique des DM Instagram n'est pas dans ce périmètre** — elle viendra plus tard et
ne doit pas contraindre l'architecture.

Le principe directeur : **rien n'est publié sans validation humaine**. L'automatisation porte sur la
saisie et la mise en forme, jamais sur la décision éditoriale.

---

## 2. Périmètre de cette première version

À construire :

1. Une base de données d'événements
2. Un **site public** : vue semaine, page par événement, formulaire de soumission
3. Un **back-office** de validation réservé à l'équipe
4. L'arrivée des soumissions par **formulaire** et par **mail**
5. Un **export XLSX** de la semaine validée, destiné à Canva Bulk Create

Explicitement hors périmètre pour l'instant :

- Récupération automatique des DM Instagram
- Publication automatique sur Instagram
- Filtres par genre, recherche, export .ics, comptes utilisateurs publics

---

## 3. Stack

- **Supabase** — base Postgres, authentification de l'équipe, stockage des affiches
- **Next.js** (App Router) déployé sur **Vercel**, ou équivalent — site public + back-office
- Tâches planifiées via **Supabase cron / Edge Functions**, pas de n8n ni de serveur à administrer
- Extraction du contenu des mails par un modèle léger, appelé depuis une Edge Function

Contrainte forte : **tout doit tenir dans les paliers gratuits**. Budget cible sous 6 €/mois hors
nom de domaine. Ne pas introduire de dépendance payante sans le signaler.

Deux pièges connus :

- Un projet Supabase gratuit **se met en pause après une semaine sans activité**. La tâche planifiée
  quotidienne de relève des mails suffit à l'éviter — la mettre en place dès le début.
- Les affiches rempliront le Go de stockage bien avant les fiches. **Redimensionner à la réception**
  (largeur max 1200 px, JPEG/WebP) et prévoir une purge des événements de plus d'un an.

---

## 4. Modèle de données

### `venues`

Table à part, pas un champ texte libre. Elle fiabilise le filtrage géographique, le dédoublonnage et
le pré-remplissage des fiches.

| champ | type | note |
|---|---|---|
| `id` | uuid | |
| `name` | text | unique, ex. « PENNY LANE » |
| `aliases` | text[] | orthographes alternatives, pour la reconnaissance automatique |
| `address` | text | |
| `city` | text | défaut `Rennes` |
| `url` | text | site ou page du lieu |

### `events`

| champ | type | obligatoire | note |
|---|---|---|---|
| `id` | uuid | ✓ | |
| `date` | date | ✓ | |
| `time_label` | text | ✓ | libellé tel quel : `22H-3H`, `21H-00H30` |
| `starts_at` | timestamptz | | dérivé, pour le tri |
| `venue_id` | uuid → venues | ✓ | |
| `venue_raw` | text | | ce qu'a écrit l'organisateur, si le lieu n'est pas reconnu |
| `title` | text | ✓ | artistes ou intitulé : `AGATHA / RIXXI K9` |
| `genres` | text | ✓ | libre, affiché entre parenthèses : `hard techno, indus` |
| `price` | text | | `10 €`, `Gratuit`, `Prix libre` |
| `ticket_url` | text | | |
| `fb_url` | text | | |
| `collective_url` | text | | |
| `description` | text | | |
| `poster_path` | text | | référence Supabase Storage |
| `contact_name` | text | ✓ | **jamais publié** |
| `contact_email` | text | ✓ | **jamais publié** |
| `status` | enum | ✓ | voir ci-dessous |
| `source` | enum | ✓ | `form` / `mail` / `dm` / `manual` |
| `raw_message` | text | ✓ | message d'origine, affiché en relecture |
| `rights_ok` | bool | ✓ | case de cession de droits cochée |
| `created_at`, `updated_at` | timestamptz | ✓ | |

### Statuts

```
draft → pending → published
              → incomplete (relance envoyée)
              → rejected (motif obligatoire)
```

Seul `published` est visible sur le site public. Appliquer une RLS stricte : lecture anonyme
uniquement sur `status = 'published'` et jamais sur les colonnes `contact_*` ni `raw_message`.

---

## 5. Règles métier

**Semaine.** Lundi → dimanche. **Les jours sans événement ne s'affichent pas**, et la plage annoncée
en sous-titre se calcule sur les dates réellement présentes : une semaine qui n'a que mardi, samedi
et dimanche affiche « 23 > 28 juin ». Quand un seul jour est rempli, la barre de pastilles disparaît.

**Deux temporalités distinctes**, à ne pas confondre :

- Le **post Instagram** est figé : clôture mardi 20 h, publication mercredi.
- Le **site** se met à jour en continu. Un événement reçu jeudi pour le samedi est publiable.

Le formulaire doit dire les deux clairement.

**Pré-filtrage automatique** avant la file de relecture — rejet ou signalement, jamais publication :

- date passée
- ville hors Rennes et communes limitrophes
- doublon : même `date` + même `venue_id` → fusionner plutôt que créer
- champ obligatoire manquant → statut `incomplete` et relance de l'organisateur

**Filtrage éditorial.** Humain, jamais automatique. La grille de tri sera fournie à part et n'est pas
encore écrite — ne pas l'inventer, ne pas coder de règle de genre ou de type d'événement.

**Comportement par défaut si personne ne valide : ne rien publier.** Prévoir une alerte à l'équipe la
veille de la clôture si la file d'attente n'est pas vide.

---

## 6. Écrans

La maquette `maquette/site.html` est de référence pour le site public. Elle est fonctionnelle : vue
semaine, fiche d'événement, formulaire. Les données y sont en dur.

### Public

- **Vue semaine** — jours en sections, une ligne par événement au format `LIEU | HORAIRES | INTITULÉ (genres)`. Le lieu vient en premier, c'est délibéré. Navigation semaine précédente / suivante.
- **Fiche événement** — URL propre et partageable. C'est ici que vont l'adresse, les liens billetterie, Facebook et collectif, l'affiche en grand. Quand un champ manque, l'afficher comme manquant plutôt que de masquer la ligne.
- **Formulaire de soumission** — champs de la table `events`, case de cession de droits obligatoire, avertissement explicite : *un partage de publication Instagram ne transmet pas l'image, envoyer le fichier*.

### Back-office

- Liste des fiches en attente, triées par date d'événement
- **Fiche extraite et message d'origine côte à côte** — indispensable, l'extraction se trompe surtout sur les dates relatives (« vendredi prochain », « ce week-end »)
- Trois actions : publier / demander un complément / refuser avec motif
- Bouton d'export XLSX de la semaine validée

### Export Canva

Une ligne par événement, colonnes nommées pour correspondre aux champs du gabarit Canva Bulk Create.
Limites de l'outil : 300 lignes, 150 champs, et **les images doivent être intégrées dans les cellules**,
pas référencées par URL.

---

## 7. Direction artistique

Fond noir, jaune fluo, tout en capitales, filets jaunes de 2 px entre les lignes. Reprendre les
valeurs de la maquette :

```css
--black:    #000000;
--panel:    #0c0c0c;
--panel-2:  #151512;
--yellow:   #ebf54f;   /* accent unique */
--white:    #ffffff;
--grey:     #9b9b95;   /* texte secondaire */
--grey-d:   #6a6a66;   /* champs manquants, états inactifs */
```

Typographie : **Unbounded** (600/700/800) pour les titres, **Archivo** (400 à 700) pour le reste.
Les deux sont sur Google Fonts.

Thème unique assumé — pas de variante claire. Le fond doit être peint explicitement.

Conventions à respecter, elles viennent du compte existant :

- Noms de lieux en capitales
- Genres en minuscules entre parenthèses, à la fin de la ligne
- Une entrée gratuite est mise en avant : `// GRATUIT` en jaune

---

## 8. Ce qu'il faudra prévoir sans le construire maintenant

Architecturer de façon à ce que ces ajouts ne demandent pas de refonte :

- Une quatrième valeur `dm` dans `source`, alimentée plus tard par un webhook
- Un champ « coller un message » dans le back-office qui lance l'extraction sur du texte brut — c'est le substitut gratuit à l'intégration Instagram, à faire tôt, il enlève l'essentiel de la corvée
- La publication Instagram, comme une sortie de plus de la base, au même titre que le site et l'export Canva

---

## 9. Recette

- [ ] Une soumission par formulaire arrive en `pending` et n'apparaît pas sur le site
- [ ] Une fiche validée apparaît sur la bonne semaine, le bon jour, au bon rang horaire
- [ ] Un jour sans événement ne s'affiche pas et la plage de dates s'ajuste
- [ ] Une semaine entièrement vide affiche l'état vide, pas une page cassée
- [ ] Une fiche sans horaire, sans tarif et sans lien reste lisible et le signale
- [ ] Deux soumissions même date + même lieu sont détectées comme doublon
- [ ] `contact_email` n'est accessible par aucune requête anonyme
- [ ] Le site est lisible à 360 px de large, sans défilement horizontal
- [ ] L'export XLSX s'ouvre dans Canva Bulk Create et remplit le gabarit
