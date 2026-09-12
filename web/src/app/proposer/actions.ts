'use server';

import { isYmd } from '@/lib/dates';
import type { SubmitState } from '@/lib/submit';

/**
 * Réception d'une proposition d'événement.
 *
 * Rien n'est encore enregistré : la base Supabase n'existe pas. Cette action
 * valide la saisie et s'arrête là. Le jour où la base arrive, c'est ici et
 * nulle part ailleurs que l'insertion se branche — en forçant
 * `status = 'pending'` et `source = 'form'` côté serveur, jamais depuis le
 * navigateur, pour qu'une proposition ne puisse pas naître publiée.
 */

const REQUIRED: { field: string; label: string }[] = [
  { field: 'venue', label: 'le lieu' },
  { field: 'date', label: 'la date' },
  { field: 'timeLabel', label: 'les horaires' },
  { field: 'title', label: 'les artistes ou l’intitulé' },
  { field: 'genres', label: 'les genres' },
  { field: 'contactName', label: 'votre nom ou celui du collectif' },
  { field: 'contactEmail', label: 'votre e-mail' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

export async function submitProposal(
  _previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const errors: Record<string, string> = {};

  for (const { field, label } of REQUIRED) {
    if (!text(formData, field)) errors[field] = `Il manque ${label}.`;
  }

  const date = text(formData, 'date');
  if (date && !isYmd(date)) {
    errors.date = 'Cette date n’est pas valide.';
  }

  const email = text(formData, 'contactEmail');
  if (email && !EMAIL_RE.test(email)) {
    errors.contactEmail = 'Cette adresse e-mail n’est pas valide.';
  }

  // La cession de droits n'est pas une formalité : sans elle, on ne peut pas
  // republier l'affiche. Elle est donc bloquante, pas simplement signalée.
  if (formData.get('rightsOk') !== 'on') {
    errors.rightsOk = 'La case d’autorisation doit être cochée.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: 'error',
      errors,
      message: 'La proposition n’a pas été envoyée : il manque des éléments.',
    };
  }

  // TODO(base) — insérer dans `events` avec status='pending', source='form',
  // puis téléverser l'affiche dans Supabase Storage après redimensionnement.
  return { status: 'sent', errors: {} };
}
