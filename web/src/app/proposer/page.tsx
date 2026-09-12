import Link from 'next/link';
import type { Metadata } from 'next';

import SubmitForm from '@/components/SubmitForm';

export const metadata: Metadata = {
  title: 'Proposer une date',
  description:
    'Envoyez votre soirée ou votre concert à l’agenda. Clôture le mardi 20 h pour le post Instagram, ajout au site possible ensuite.',
};

export default function SubmitPage() {
  return (
    <>
      <Link href="/" className="back">
        &#8592; Retour à la semaine
      </Link>
      <SubmitForm />
    </>
  );
}
