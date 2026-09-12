import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="nothing">
      <p className="b">Page introuvable</p>
      <p>
        Cette page n’existe pas, ou l’événement n’est plus à l’affiche de
        l’agenda.
      </p>
      <Link href="/" className="btn btn-solid">
        Retour à la semaine
      </Link>
    </div>
  );
}
