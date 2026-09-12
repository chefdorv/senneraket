/**
 * Modèle d'événement côté public.
 *
 * Les champs reprennent un à un ceux de la table `events` (voir
 * `docs/brief.md` §4), à l'exception des colonnes qui ne sortent jamais de la
 * base : `contact_name`, `contact_email`, `raw_message`, `status`, `source`.
 * Elles n'ont volontairement pas de place dans ce type — ce qui n'est pas
 * modélisable ici ne peut pas fuiter dans une page.
 *
 * Presque tout est nullable, et c'est le sujet du produit : les organisateurs
 * envoient des fiches incomplètes. Un champ manquant s'affiche comme manquant,
 * il ne masque pas la ligne.
 */

import type { Ymd } from './dates';

export type Venue = {
  name: string;
  city: string;
  address: string | null;
  url: string | null;
};

export type PublicEvent = {
  id: string;
  /** Segment d'URL de la fiche, stable et partageable. */
  slug: string;
  date: Ymd;
  /** Libellé tel que l'organisateur l'a écrit : `22H-3H`, `21H-00H30`. */
  timeLabel: string | null;
  venue: Venue;
  /** Ce qu'a écrit l'organisateur quand le lieu n'est pas dans `venues`. */
  venueRaw: string | null;
  title: string;
  genres: string;
  price: string | null;
  ticketUrl: string | null;
  fbUrl: string | null;
  collectiveUrl: string | null;
  description: string | null;
  posterUrl: string | null;
};

/** Une entrée gratuite est mise en avant dans la liste. */
export function isFree(price: string | null): boolean {
  return price !== null && /gratuit|libre/i.test(price);
}

/**
 * Le lieu à afficher : le lieu reconnu, ou à défaut ce qu'a écrit
 * l'organisateur. En capitales, convention reprise du compte existant.
 */
export function venueLabel(event: PublicEvent): string {
  return (event.venue.name || event.venueRaw || 'Lieu inconnu').toUpperCase();
}

/**
 * Fabrique un slug à partir de l'intitulé et de la date. Le même algorithme
 * sera rejoué côté base (migration 0001) pour que les URLs déjà partagées ne
 * bougent pas quand les données passeront de ce fichier à Postgres.
 */
export function makeSlug(title: string, date: Ymd): string {
  const base = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // les accents détachés par NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return `${base || 'date'}-${date}`;
}
