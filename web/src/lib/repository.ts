/**
 * Accès aux événements publiés.
 *
 * C'est la seule couture entre les pages et les données. Aujourd'hui elle lit
 * `fixtures.ts` ; demain elle lira la vue `public_events` de Supabase. Les
 * pages n'ont pas à savoir laquelle des deux répond, donc les signatures sont
 * déjà asynchrones.
 */

import { addDays, WEEK_LEN, type Ymd } from './dates';
import type { PublicEvent } from './events';
import { FIXTURE_EVENTS } from './fixtures';

/**
 * Rang horaire d'un événement dans sa journée, en minutes depuis minuit.
 *
 * Une soirée qui commence à 00H30 est la fin de la nuit, pas le début de la
 * journée : tout ce qui démarre avant 6 h est repoussé après le reste, sinon
 * l'after se retrouverait en tête de liste devant l'apéro de 18 h. Un
 * événement sans horaire passe en dernier.
 */
const NIGHT_PIVOT_MINUTES = 6 * 60;

export function startMinutes(timeLabel: string | null): number {
  if (!timeLabel) return Number.MAX_SAFE_INTEGER;
  const match = timeLabel.match(/(\d{1,2})\s*H\s*(\d{2})?/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) return Number.MAX_SAFE_INTEGER;
  const total = hours * 60 + minutes;
  return total < NIGHT_PIVOT_MINUTES ? total + 24 * 60 : total;
}

function byTimeThenVenue(a: PublicEvent, b: PublicEvent): number {
  const delta = startMinutes(a.timeLabel) - startMinutes(b.timeLabel);
  if (delta !== 0) return delta;
  return a.venue.name.localeCompare(b.venue.name, 'fr');
}

/** Les événements publiés d'une semaine, du lundi au dimanche. */
export async function listWeek(weekStart: Ymd): Promise<PublicEvent[]> {
  const weekEnd = addDays(weekStart, WEEK_LEN - 1);
  return FIXTURE_EVENTS.filter(
    (event) => event.date >= weekStart && event.date <= weekEnd,
  ).sort((a, b) => a.date.localeCompare(b.date) || byTimeThenVenue(a, b));
}

/** Une fiche par son slug, ou `null` si elle n'existe pas ou n'est pas publiée. */
export async function getEvent(slug: string): Promise<PublicEvent | null> {
  return FIXTURE_EVENTS.find((event) => event.slug === slug) ?? null;
}

/** Tous les slugs publiés, pour le pré-rendu des fiches. */
export async function listSlugs(): Promise<string[]> {
  return FIXTURE_EVENTS.map((event) => event.slug);
}

/** Regroupe une semaine par jour, en ne gardant que les jours remplis. */
export function groupByDay(
  events: PublicEvent[],
): { date: Ymd; events: PublicEvent[] }[] {
  const days = new Map<Ymd, PublicEvent[]>();
  for (const event of events) {
    const bucket = days.get(event.date);
    if (bucket) bucket.push(event);
    else days.set(event.date, [event]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, events: list }));
}
