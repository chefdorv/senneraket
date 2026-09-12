/**
 * Contrat partagé entre le formulaire et son action serveur.
 *
 * Il vit ici, et pas dans `app/proposer/actions.ts`, parce qu'un module
 * `'use server'` ne peut exporter que des fonctions asynchrones : tout autre
 * export y est effacé à la compilation et arrive `undefined` côté client.
 */

export type SubmitState = {
  status: 'idle' | 'error' | 'sent';
  /** Message par champ, indexé par l'attribut `name` de l'input. */
  errors: Record<string, string>;
  /** Message général, affiché en tête de formulaire. */
  message?: string;
};

export const INITIAL_SUBMIT_STATE: SubmitState = { status: 'idle', errors: {} };
