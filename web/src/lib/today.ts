import { isYmd, todayInParis, type Ymd } from './dates';

/**
 * La date qui sert de « maintenant » au site.
 *
 * En temps normal c'est aujourd'hui à Rennes. Tant que le site tourne sur les
 * données de démonstration — figées sur la semaine du 27 juin 2026 reprise du
 * post — la variable d'environnement `DEMO_TODAY` permet de s'y placer, sans
 * quoi la page d'accueil afficherait une semaine vide. Elle disparaîtra en
 * même temps que `fixtures.ts`.
 */
export function referenceToday(): Ymd {
  const override = process.env.DEMO_TODAY;
  if (override && isYmd(override)) return override;
  return todayInParis();
}
