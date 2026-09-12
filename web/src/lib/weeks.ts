import { addDays, startOfWeek, WEEK_LEN, type Ymd } from './dates';
import { referenceToday } from './today';

/**
 * Plage des semaines consultables.
 *
 * En export statique, chaque semaine doit exister comme fichier écrit
 * d'avance : la navigation ne peut pas être infinie comme elle le serait avec
 * un serveur. Cette borne est partagée entre la génération des pages et les
 * flèches de navigation, pour qu'une flèche ne propose jamais une semaine qui
 * n'a pas été générée.
 */
const WEEKS_AROUND = 8;

export function weekStarts(): Ymd[] {
  const current = startOfWeek(referenceToday());
  return Array.from({ length: WEEKS_AROUND * 2 + 1 }, (_, i) =>
    addDays(current, (i - WEEKS_AROUND) * WEEK_LEN),
  );
}

export function weekBounds(): { first: Ymd; last: Ymd } {
  const all = weekStarts();
  return { first: all[0], last: all[all.length - 1] };
}
