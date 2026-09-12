'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
  INITIAL_SUBMIT_STATE,
  validateProposal,
  type SubmitState,
} from '@/lib/submit';

/**
 * Le formulaire de proposition — un formulaire par soirée.
 *
 * Il est découpé en trois blocs qui disent leur intention : l'essentiel, ce
 * qui manque presque toujours, et de quoi vous joindre. La hiérarchie vient
 * du constat de terrain : les organisateurs envoient le lieu et l'heure, et
 * oublient le tarif, la billetterie et l'affiche.
 */
export default function SubmitForm() {
  const [state, setState] = useState<SubmitState>(INITIAL_SUBMIT_STATE);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState(validateProposal(new FormData(event.currentTarget)));
  }

  if (state.status === 'sent') {
    return (
      <div className="form">
        <div className="sent">
          <h2>Proposition reçue</h2>
          <p>
            Elle part en relecture. L’équipe traite les envois le mardi soir,
            et vous aurez une réponse dans tous les cas — y compris si la
            soirée ne rentre pas dans la ligne de l’agenda.
          </p>
          <p>S’il manque une info, on vous écrit avant la clôture.</p>
          {/* Le site est une démonstration : rien n'est parti nulle part, et
              il serait malhonnête de laisser croire le contraire à quelqu'un
              qui aurait rempli le formulaire pour de bon. */}
          <p className="warn">
            Ceci est une démonstration : votre saisie n’a pas été envoyée et
            n’a été enregistrée nulle part.
          </p>
          <p style={{ marginTop: 18 }}>
            <Link href="/" className="btn">
              Retour à la semaine
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const error = (field: string) =>
    state.errors[field] ? (
      <p className="hint" style={{ color: '#ff9d9d' }}>
        {state.errors[field]}
      </p>
    ) : null;

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <h1>Proposer une date</h1>
      <p className="intro">
        Un formulaire par soirée. Plus la fiche est complète, moins on a de
        questions à vous poser.
      </p>

      <p className="dl">
        Pour figurer sur le <b>post Instagram</b> de la semaine, envoyez avant
        le <b>mardi 20 h</b> — la publication part le mercredi. Passé ce délai,
        la date peut quand même être ajoutée <b>sur le site</b>, tant qu’elle
        n’a pas eu lieu.
      </p>

      {state.status === 'error' && state.message && (
        <p className="err" role="alert">
          {state.message}
        </p>
      )}

      <fieldset>
        <legend>L’essentiel</legend>

        <div className="row2 f">
          <label htmlFor="venue">
            Lieu <span className="rq">*</span>
          </label>
          <input
            id="venue"
            name="venue"
            required
            placeholder="Penny Lane, SBX, Jardin Moderne…"
          />
          <p className="hint">
            Les lieux déjà connus remplissent l’adresse tout seuls.
          </p>
          {error('venue')}
        </div>

        <div className="row2 two">
          <div className="f">
            <label htmlFor="date">
              Date <span className="rq">*</span>
            </label>
            <input id="date" name="date" type="date" required />
            {error('date')}
          </div>
          <div className="f">
            <label htmlFor="timeLabel">
              Horaires <span className="rq">*</span>
            </label>
            <input
              id="timeLabel"
              name="timeLabel"
              required
              placeholder="22H-3H"
            />
            {error('timeLabel')}
          </div>
        </div>

        <div className="row2 f">
          <label htmlFor="title">
            Artistes / intitulé <span className="rq">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="AGATHA / RIXXI K9"
          />
          {error('title')}
        </div>

        <div className="row2 f">
          <label htmlFor="genres">
            Genres <span className="rq">*</span>
          </label>
          <input
            id="genres"
            name="genres"
            required
            placeholder="hard techno, indus"
          />
          <p className="hint">
            Repris tels quels entre parenthèses, comme sur le post.
          </p>
          {error('genres')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Ce qui manque presque toujours</legend>

        <div className="row2 f">
          <label htmlFor="price">Tarif</label>
          <input id="price" name="price" placeholder="10 €, prix libre, gratuit…" />
          <p className="hint">
            Une entrée gratuite est mise en avant dans la liste.
          </p>
        </div>

        <div className="row2 f">
          <label htmlFor="ticketUrl">Lien billetterie</label>
          <input id="ticketUrl" name="ticketUrl" type="url" placeholder="https://" />
        </div>

        <div className="row2 f">
          <label htmlFor="fbUrl">Lien de l’événement Facebook</label>
          <input id="fbUrl" name="fbUrl" type="url" placeholder="https://" />
        </div>

        <div className="row2 f">
          <label htmlFor="description">
            Deux ou trois lignes de présentation
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="La configuration, les invités, une info pratique…"
          />
        </div>

        <div className="row2 f">
          <label htmlFor="poster">Affiche</label>
          <input id="poster" name="poster" type="file" accept="image/*" />
          <p className="hint">
            Un partage de post en DM ne transmet pas l’image — envoyez le
            fichier.
          </p>
        </div>
      </fieldset>

      <fieldset>
        <legend>Pour vous joindre</legend>

        <div className="row2 two">
          <div className="f">
            <label htmlFor="contactName">
              Nom ou collectif <span className="rq">*</span>
            </label>
            <input id="contactName" name="contactName" required />
            {error('contactName')}
          </div>
          <div className="f">
            <label htmlFor="contactEmail">
              E-mail <span className="rq">*</span>
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
            />
            {error('contactEmail')}
          </div>
        </div>

        <p className="hint" style={{ color: 'var(--grey)', fontSize: 12.5 }}>
          Sert uniquement à revenir vers vous. Jamais publié.
        </p>
      </fieldset>

      <label className="chk">
        <input type="checkbox" id="rightsOk" name="rightsOk" required />
        <span>
          J’autorise la diffusion de l’affiche et des infos envoyées sur
          l’agenda et ses réseaux, et je confirme en détenir les droits.
        </span>
      </label>
      {error('rightsOk')}

      <button className="btn btn-solid submit" type="submit">
        Envoyer
      </button>
    </form>
  );
}
