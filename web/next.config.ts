import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

/**
 * Le site est publié en fichiers écrits d'avance, servis par GitHub Pages.
 *
 * C'est une contrainte assumée tant qu'il n'y a pas de base : sans serveur
 * d'application, pas d'action serveur ni de page calculée à la demande. Le
 * jour où la base arrive, il suffira de retirer `output` pour retrouver le
 * rendu dynamique — le reste du code est déjà écrit pour ça.
 *
 * `trailingSlash` fait émettre `proposer/index.html` plutôt que
 * `proposer.html`, la seule forme que GitHub Pages sert sans ambiguïté.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,

  // Le dépôt a deux package-lock.json — un ici, un à la racine pour le runner
  // de migrations. Sans cette ligne, Turbopack déduit que la racine du projet
  // est celle du dépôt et le signale à chaque build.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default nextConfig;
