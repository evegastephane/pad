import { FormEvent, useState } from 'react';
import { api, Me } from '../api';
import { Avis, Bouton, Libelle } from '../ui/kit';
import Accueil from './Accueil';

export default function ChangerMdp({ me, onFait, onSortir }: { me: Me; onFait: () => void; onSortir: () => void }) {
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirme, setConfirme] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (nouveau.length < 8) return setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    if (nouveau !== confirme) return setErreur('Les deux saisies du nouveau mot de passe ne correspondent pas.');
    setEnvoi(true);
    try {
      await api('/me/password', { body: { actuel, nouveau } });
      onFait();
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Accueil>
      <form onSubmit={soumettre} className="space-y-5" noValidate>
        <div>
          <h2 className="large text-xl font-extrabold uppercase text-marine-nuit">Votre mot de passe</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-encre-douce">
            {me.nom}, le mot de passe remis par l'administration est provisoire. Choisissez le vôtre avant de continuer.
          </p>
        </div>
        <Libelle titre="Mot de passe reçu">
          <input type="password" className="champ" value={actuel} onChange={(e) => setActuel(e.target.value)} autoComplete="current-password" autoFocus />
        </Libelle>
        <Libelle titre="Nouveau mot de passe" aide="8 caractères minimum.">
          <input type="password" className="champ" value={nouveau} onChange={(e) => setNouveau(e.target.value)} autoComplete="new-password" />
        </Libelle>
        <Libelle titre="Confirmez le nouveau mot de passe">
          <input type="password" className="champ" value={confirme} onChange={(e) => setConfirme(e.target.value)} autoComplete="new-password" />
        </Libelle>
        {erreur && <Avis ton="erreur">{erreur}</Avis>}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Bouton type="button" variante="discret" onClick={onSortir}>Se déconnecter</Bouton>
          <Bouton type="submit" chargement={envoi} className="min-h-[48px]">Enregistrer</Bouton>
        </div>
      </form>
    </Accueil>
  );
}
