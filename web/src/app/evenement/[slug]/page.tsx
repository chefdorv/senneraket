import Link from 'next/link';
import { notFound } from 'next/navigation';

import { longDayLabel, startOfWeek } from '@/lib/dates';
import { venueLabel } from '@/lib/events';
import { getEvent, listSlugs } from '@/lib/repository';

export const dynamicParams = false;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};
  return {
    title: event.title,
    description: `${venueLabel(event)} — ${longDayLabel(event.date)}${
      event.timeLabel ? `, ${event.timeLabel}` : ''
    } (${event.genres})`,
  };
}

/**
 * La fiche d'un événement, à une URL propre et partageable.
 *
 * Règle de la maquette respectée à la lettre : quand un champ manque, on
 * l'affiche comme manquant au lieu de masquer la ligne. Un tarif absent n'est
 * pas une gratuité, et le lecteur doit pouvoir faire la différence.
 */
export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const links = [
    event.ticketUrl && {
      href: event.ticketUrl,
      label: 'Billetterie',
      solid: true,
    },
    event.fbUrl && {
      href: event.fbUrl,
      label: 'Événement Facebook',
      solid: false,
    },
    event.collectiveUrl && {
      href: event.collectiveUrl,
      label: 'Le collectif',
      solid: false,
    },
  ].filter((link): link is { href: string; label: string; solid: boolean } =>
    Boolean(link),
  );

  return (
    <>
      <Link href={`/semaine/${startOfWeek(event.date)}`} className="back">
        &#8592; Retour à la semaine
      </Link>

      <article className="det">
        <p className="det-when">
          {longDayLabel(event.date)}
          {event.timeLabel && ` · ${event.timeLabel}`}
        </p>

        <h1>{event.title}</h1>
        <p className="gen">{event.genres}</p>

        {event.posterUrl && (
          /* eslint-disable-next-line @next/next/no-img-element --
             les affiches viennent de Supabase Storage à des dimensions
             inconnues ; `next/image` sera branché quand le bucket existera. */
          <img
            className="poster"
            src={event.posterUrl}
            alt={`Affiche de ${event.title}`}
          />
        )}

        {event.description ? (
          <p className="desc">{event.description}</p>
        ) : (
          <p className="desc none">
            Aucune description fournie par l’organisateur.
          </p>
        )}

        <dl className="facts">
          <div className="fact">
            <dt>Lieu</dt>
            <dd>
              {venueLabel(event)}
              <span className="m">
                {event.venue.address
                  ? `${event.venue.address}, ${event.venue.city}`
                  : event.venue.city}
              </span>
            </dd>
          </div>

          <div className="fact">
            <dt>Horaires</dt>
            {event.timeLabel ? (
              <dd>{event.timeLabel}</dd>
            ) : (
              <dd className="miss">Non communiqués</dd>
            )}
          </div>

          <div className="fact">
            <dt>Tarif</dt>
            {event.price ? (
              <dd>{event.price}</dd>
            ) : (
              <dd className="miss">Non communiqué</dd>
            )}
          </div>

          <div className="fact">
            <dt>Genres</dt>
            <dd>{event.genres}</dd>
          </div>
        </dl>

        <div className="links">
          {links.length > 0 ? (
            links.map((link) => (
              <a
                key={link.label}
                className={`btn${link.solid ? ' btn-solid' : ''}`}
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))
          ) : (
            <span className="none">
              Aucun lien transmis par l’organisateur
            </span>
          )}
        </div>
      </article>
    </>
  );
}
