import { notFound, redirect } from 'next/navigation';

import WeekView from '@/components/WeekView';
import { isYmd, rangeLabel, startOfWeek, WEEK_LEN, addDays } from '@/lib/dates';
import { referenceToday } from '@/lib/today';

export const revalidate = 60;

type Params = { params: Promise<{ start: string }> };

export async function generateMetadata({ params }: Params) {
  const { start } = await params;
  if (!isYmd(start)) return {};
  const weekStart = startOfWeek(start);
  return {
    title: `Semaine du ${rangeLabel([weekStart, addDays(weekStart, WEEK_LEN - 1)])}`,
  };
}

export default async function WeekPage({ params }: Params) {
  const { start } = await params;
  if (!isYmd(start)) notFound();

  // Une URL qui ne tombe pas un lundi reste valide : on la ramène sur le
  // lundi de sa semaine plutôt que de renvoyer une 404, pour qu'un lien
  // recopié à la main continue de marcher.
  const weekStart = startOfWeek(start);
  if (weekStart !== start) redirect(`/semaine/${weekStart}`);

  return <WeekView weekStart={weekStart} today={referenceToday()} />;
}
