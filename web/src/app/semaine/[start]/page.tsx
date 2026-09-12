import { notFound } from 'next/navigation';

import WeekView from '@/components/WeekView';
import { addDays, isYmd, rangeLabel, startOfWeek, WEEK_LEN } from '@/lib/dates';
import { referenceToday } from '@/lib/today';
import { weekStarts } from '@/lib/weeks';

/**
 * Seuls les lundis de la plage sont générés. Avec un serveur, une URL tombant
 * un autre jour était redirigée vers le lundi de sa semaine ; en statique il
 * n'y a personne pour rediriger, donc elle renvoie une 404. À rétablir le
 * jour où le site tourne sur un serveur d'application.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return weekStarts().map((start) => ({ start }));
}

type Params = { params: Promise<{ start: string }> };

export async function generateMetadata({ params }: Params) {
  const { start } = await params;
  if (!isYmd(start)) return {};
  return {
    title: `Semaine du ${rangeLabel([start, addDays(start, WEEK_LEN - 1)])}`,
  };
}

export default async function WeekPage({ params }: Params) {
  const { start } = await params;
  if (!isYmd(start) || startOfWeek(start) !== start) notFound();

  return <WeekView weekStart={start} today={referenceToday()} />;
}
