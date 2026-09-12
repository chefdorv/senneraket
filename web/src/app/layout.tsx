import type { Metadata, Viewport } from 'next';
import { Archivo, Unbounded } from 'next/font/google';
import Link from 'next/link';

import './globals.css';

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-unbounded',
  display: 'swap',
});

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Tek a Rennes — l’agenda',
    template: '%s — Tek a Rennes',
  },
  description:
    'Les concerts et les soirées de Rennes, semaine par semaine. Publication le mercredi, site mis à jour en continu.',
  // Le site n'est pas encore ouvert : il reste hors des moteurs de recherche
  // tant que la base n'alimente pas les pages. À lever au lancement, en même
  // temps que le `Disallow: /` de `robots.txt`.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${unbounded.variable} ${archivo.variable}`}>
      <body>
        <p className="mock">
          Démonstration &middot; samedi 27 juin repris du post existant
          &middot; les autres jours sont des exemples
        </p>

        <div className="shell">
          <header className="bar">
            <Link href="/" className="wordmark">
              Tek a Rennes
            </Link>
            <nav className="barnav" aria-label="Navigation principale">
              <Link href="/" className="btn">
                La semaine
              </Link>
              <Link href="/proposer" className="btn btn-solid">
                Proposer
              </Link>
            </nav>
          </header>

          <main>{children}</main>

          <footer>
            <div className="mk">Tek a Rennes</div>
            <div className="fl">
              <span>Publication le mercredi</span>
              <span>Le site est mis à jour en continu</span>
              <span>Mentions légales</span>
              <span>Instagram</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
