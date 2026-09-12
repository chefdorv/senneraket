/**
 * Outils de date de l'agenda.
 *
 * Tout est manipulé en `YYYY-MM-DD` (une date civile, sans heure ni fuseau)
 * plutôt qu'en `Date`. Un événement du samedi soir est un événement du samedi,
 * quel que soit le fuseau du serveur qui rend la page — et Vercel rend en UTC.
 * Seul `todayInParis()` a besoin d'un fuseau, et il le nomme explicitement.
 */

/** Lundi. La semaine de l'agenda va du lundi au dimanche. */
const WEEK_START = 1;
export const WEEK_LEN = 7;

export const DAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const;

export const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/** Une date civile au format `YYYY-MM-DD`. */
export type Ymd = string;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(value: string): value is Ymd {
  if (!YMD_RE.test(value)) return false;
  // Rejette les dates syntaxiquement valides mais inexistantes (2026-02-31).
  return toYmd(fromYmd(value)) === value;
}

export function toYmd(date: Date): Ymd {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromYmd(value: Ymd): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: Ymd, days: number): Ymd {
  const date = fromYmd(value);
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

/** Le lundi de la semaine qui contient `value`. */
export function startOfWeek(value: Ymd): Ymd {
  const date = fromYmd(value);
  const offset = (date.getDay() - WEEK_START + 7) % 7;
  date.setDate(date.getDate() - offset);
  return toYmd(date);
}

/** Aujourd'hui à Rennes, indépendamment du fuseau du serveur. */
export function todayInParis(): Ymd {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  // `en-CA` formate déjà en YYYY-MM-DD.
  return parts;
}

/** Les 7 dates d'une semaine, du lundi au dimanche. */
export function weekDays(weekStart: Ymd): Ymd[] {
  return Array.from({ length: WEEK_LEN }, (_, i) => addDays(weekStart, i));
}

/** « samedi 27 juin ». */
export function dayLabel(value: Ymd): string {
  const date = fromYmd(value);
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** « samedi 27 juin 2026 ». */
export function longDayLabel(value: Ymd): string {
  return `${dayLabel(value)} ${fromYmd(value).getFullYear()}`;
}

/**
 * La plage affichée en sous-titre, calculée sur les jours réellement remplis
 * et non sur les bornes de la semaine : une semaine qui n'a que mardi, samedi
 * et dimanche affiche « 23 > 28 juin 2026 ». Le mois du premier jour n'est
 * répété que s'il diffère de celui du dernier.
 */
export function rangeLabel(days: Ymd[]): string {
  if (days.length === 0) return '';
  const first = fromYmd(days[0]);
  const last = fromYmd(days[days.length - 1]);
  const head =
    first.getMonth() === last.getMonth()
      ? `${first.getDate()}`
      : `${first.getDate()} ${MONTHS[first.getMonth()]}`;
  return `${head} > ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
}

/** « Cette semaine », « Semaine prochaine », sinon « Semaine du ». */
export function weekTitle(weekStart: Ymd, today: Ymd): string {
  const current = startOfWeek(today);
  const diffDays = Math.round(
    (fromYmd(weekStart).getTime() - fromYmd(current).getTime()) / 86_400_000,
  );
  const offset = Math.round(diffDays / 7);
  if (offset === 0) return 'Cette semaine';
  if (offset === 1) return 'Semaine prochaine';
  if (offset === -1) return 'Semaine dernière';
  return 'Semaine du';
}
