import { useEffect, useState } from 'react';
import { api, EntreeJournal } from '../../api';
import { Avis, Rubrique } from '../../ui/kit';

const ACTIONS: Record<string, string> = {
  REGULARISATION: 'Régularisation',
  CREATION_COMPTE: 'Création de compte',
  MODIFICATION_COMPTE: 'Modification de compte',
  REINIT_MOT_DE_PASSE: 'Mot de passe réinitialisé',
  REINIT_EMPREINTE: 'Empreinte réinitialisée',
  PARAMETRES_ZONE: 'Zone de pointage',
};

export default function Journal() {
  const [lignes, setLignes] = useState<EntreeJournal[] | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api<EntreeJournal[]>('/admin/journal').then(setLignes).catch((e) => setErreur(e.message));
  }, []);

  return (
    <div className="max-w-[1080px] space-y-4">
      <Rubrique titre="Journal des opérations">
        <p className="text-sm text-encre-douce">Les 100 dernières opérations des administrateurs.</p>
      </Rubrique>
      {erreur && <Avis ton="erreur">{erreur}</Avis>}
      <div className="overflow-x-auto rounded-[6px] border border-marine-filet bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-marine">
              {['Date', 'Opération', 'Détail', 'Par'].map((t) => <th key={t} scope="col" className="rubrique px-3 py-2.5">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {lignes === null && !erreur && <tr><td colSpan={4} className="px-3 py-10 text-center text-encre-pale">Chargement…</td></tr>}
            {lignes?.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-encre-douce">Aucune opération enregistrée.</td></tr>}
            {lignes?.map((l) => (
              <tr key={l.id} className="border-b border-marine-filet/60 align-top">
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-encre-douce">
                  {new Date(l.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Douala' })}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-marine-nuit">{ACTIONS[l.action] ?? l.action}</td>
                <td className="max-w-[60ch] px-3 py-2.5 text-encre">{l.detail}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-encre-douce">{l.auteur.nom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
