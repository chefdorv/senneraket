import Link from 'next/link';

import {
  addDays,
  dayLabel,
  rangeLabel,
  weekTitle,
  WEEK_LEN,
  type Ymd,
} from '@/lib/dates';
import { isFree, venueLabel } from '@/lib/events';
import { groupByDay, listWeek } from '@/lib/repository';
import { weekBounds } from '@/lib/weeks';

/**
 * La vue semaine : une section par jour, une ligne par événement, au format
 * `LIEU | HORAIRES | INTITULÉ (genres)`. Le lieu vient en premier, c'est
 * délibéré — c'est l'information que les lecteurs cherchent d'abord.
 *
 * Les jours sans événement ne s'affichent pas, et la plage annoncée en
 * sous-titre se calcule sur les jours réellement remplis.
 */
export default async function WeekView({
  weekStart,
  today,
}: {
  weekStart: Ymd;
  today: Ymd;
}) {
  const events = await listWeek(weekStart);
  const days = groupByDay(events);

  const previous = addDays(weekStart, -WEEK_LEN);
  const next = addDays(weekStart, WEEK_LEN);

  // Les semaines hors de la plage générée n'existent pas comme pages : la
  // flèche s'éteint plutôt que de mener à une 404.
  const { first, last } = weekBounds();
  const hasPrevious = previous >= first;
  const hasNext = next <= last;

  return (
    <>
      <section className="wk">
        <h1>{weekTitle(weekStart, today)}</h1>
        <p className="range">
          {days.length > 0
            ? rangeLabel(days.map((day) => day.date))
            : rangeLabel([weekStart, addDays(weekStart, WEEK_LEN - 1)])}
        </p>

        <nav className="wknav" aria-label="Navigation entre les semaines">
          {hasPrevious ? (
            <Link
              href={`/semaine/${previous}`}
              className="arr"
              aria-label="Semaine précédente"
            >
              &#8592;
            </Link>
          ) : (
            <span className="arr off" aria-hidden="true">
              &#8592;
            </span>
          )}
          <span className="lbl">
            {days.length === 0
              ? 'Semaine vide'
              : `${days.length} ${days.length > 1 ? 'jours' : 'jour'}`}
          </span>
          {hasNext ? (
            <Link
              href={`/semaine/${next}`}
              className="arr"
              aria-label="Semaine suivante"
            >
              &#8594;
            </Link>
          ) : (
            <span className="arr off" aria-hidden="true">
              &#8594;
            </span>
          )}
        </nav>
      </section>

      {days.length > 1 && (
        <nav className="pills" aria-label="Aller à un jour">
          {days.map((day) => (
            <a
              key={day.date}
              href={`#d-${day.date}`}
              className={`pill${day.date === today ? ' on' : ''}`}
            >
              {dayLabel(day.date)}
              {day.date === today && <span className="tn">ce soir</span>}
            </a>
          ))}
        </nav>
      )}

      {days.length === 0 ? (
        <div className="nothing">
          <p className="b">Rien de programmé</p>
          <p>Aucun événement validé sur cette période pour le moment.</p>
          <Link href="/proposer" className="btn btn-solid">
            Proposer un événement
          </Link>
        </div>
      ) : (
        days.map((day) => (
          <section className="day" id={`d-${day.date}`} key={day.date}>
            <div className="day-h">
              <h2 className="p">{dayLabel(day.date)}</h2>
              <span className="n">
                {day.events.length} {day.events.length > 1 ? 'dates' : 'date'}
              </span>
            </div>

            <div className="rows">
              {day.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/evenement/${event.slug}`}
                  className="row"
                >
                  <span className="venue">{venueLabel(event)}</span>
                  {event.timeLabel ? (
                    <span className="time">{event.timeLabel}</span>
                  ) : (
                    <span className="time nil">horaire à venir</span>
                  )}
                  <span className="what">
                    {event.title}
                    {isFree(event.price) && (
                      /* Accolades obligatoires : `//` en texte JSX nu serait
                         lu comme un commentaire. */
                      <span className="free">{' // GRATUIT'}</span>
                    )}{' '}
                    <span className="g">({event.genres})</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
