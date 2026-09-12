import WeekView from '@/components/WeekView';
import { startOfWeek } from '@/lib/dates';
import { referenceToday } from '@/lib/today';

/**
 * La semaine en cours.
 *
 * En export statique, « en cours » veut dire « au moment du build » : la page
 * ne rebasculera pas toute seule sur la semaine suivante le lundi matin. Sans
 * conséquence tant que le site tourne sur des données figées, mais c'est la
 * première chose à corriger le jour où la base arrive.
 */
export default async function HomePage() {
  const today = referenceToday();
  return <WeekView weekStart={startOfWeek(today)} today={today} />;
}
