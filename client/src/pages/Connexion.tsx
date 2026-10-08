import { FormEvent, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api, setToken } from '../api';
import { Avis, Bouton, Libelle } from '../ui/kit';
import Accueil from './Accueil';

export default function Connexion({ onConnecte }: { onConnecte: () => void }) {
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (!matricule.trim() || !password) return setErreur('Saisissez votre matricule et votre mot de passe.');
    setEnvoi(true);
    try {
      const r = await api<{ token: string }>('/auth/login', { body: { matricule: matricule.trim(), password } });
      setToken(r.token);
      onConnecte();
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
          <h2 className="large text-xl font-extrabold uppercase text-marine-nuit">Ouverture de session</h2>
          <p className="mt-1.5 text-sm text-encre-douce">Identifiez-vous avec votre matricule du Port.</p>
        </div>
        <Libelle titre="Matricule">
          <input
            className="champ text-base font-semibold uppercase tracking-[0.06em]"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            autoComplete="username"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
          />
        </Libelle>
        <Libelle titre="Mot de passe">
          <input type="password" className="champ text-base" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Libelle>
        {erreur && <Avis ton="erreur">{erreur}</Avis>}
        <Bouton type="submit" chargement={envoi} className="min-h-[52px] w-full text-[15px]">
          Se connecter {!envoi && <ArrowRight className="h-4 w-4" aria-hidden />}
        </Bouton>
        <p className="border-t border-marine-filet pt-4 text-xs leading-relaxed text-encre-douce">
          Mot de passe oublié : adressez-vous au service des ressources humaines, qui peut le réinitialiser.
        </p>
      </form>
    </Accueil>
  );
}
