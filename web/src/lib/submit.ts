/**
 * Validation d'une proposition d'événement.
 *
 * Fonction pure, sans accès réseau ni base : elle tourne aujourd'hui dans le
 * navigateur, faute de serveur d'application, et c'est exactement la même
 * qu'appellera l'action serveur le jour où la base existera. Une validation
 * côté client ne protège rien — elle rend juste le formulaire utilisable ;
 * c'est le serveur qui devra la rejouer, sans exception.
 */

import { isYmd } from './dates';

export type SubmitState = {
  status: 'idle' | 'error' | 'sent';
  /** Message par champ, indexé par l'attribut `name` de l'input. */
  errors: Record<string, string>;
  /** Message général, affiché en tête de formulaire. */
  message?: string;
};

export const INITIAL_SUBMIT_STATE: SubmitState = { status: 'idle', errors: {} };

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

export function validateProposal(formData: FormData): SubmitState {
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

  return { status: 'sent', errors: {} };
}
