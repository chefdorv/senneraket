import WeekView from '@/components/WeekView';
import { startOfWeek } from '@/lib/dates';
import { referenceToday } from '@/lib/today';

/**
 * La semaine en cours. Rafraîchie toutes les minutes : le site se met à jour
 * en continu, et il doit basculer sur la semaine suivante le lundi matin sans
 * qu'on ait à redéployer.
 */
export const revalidate = 60;

export default async function HomePage() {
  const today = referenceToday();
  return <WeekView weekStart={startOfWeek(today)} today={today} />;
}
