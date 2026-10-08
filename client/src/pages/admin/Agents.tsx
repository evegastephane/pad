import { Ondes } from '../../ui/fiduciaire';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fingerprint, KeyRound, Search, UserPlus } from 'lucide-react';
import { Agent, api, Me, Role } from '../../api';
import { ROLES } from '../../format';
import { Avis, Bouton, Libelle, Marqueur, Rubrique } from '../../ui/kit';

// Mot de passe provisoire lisible à l'oral (sans 0/O, 1/l)
const provisoire = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const t = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(t, (n) => c[n % c.length]).join('');
};

type Action =
  | { type: 'modifier'; agent: Agent }
  | { type: 'mdp'; agent: Agent }
  | { type: 'empreinte'; agent: Agent }
  | { type: 'actif'; agent: Agent };

export default function Agents({ me }: { me: Me }) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [recherche, setRecherche] = useState('');
  const [voirInactifs, setVoirInactifs] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [avis, setAvis] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(() => api<Agent[]>('/admin/users').then(setAgents).catch((e) => setAvis({ ok: false, texte: e.message })), []);
  useEffect(() => { charger(); }, [charger]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (agents ?? []).filter(
      (a) => (voirInactifs || a.actif) && (!q || `${a.nom} ${a.matricule} ${a.service ?? ''}`.toLowerCase().includes(q)),
    );
  }, [agents, recherche, voirInactifs]);

  const services = useMemo(() => [...new Set((agents ?? []).map((a) => a.service).filter(Boolean) as string[])].sort(), [agents]);
  const sansEmpreinte = (agents ?? []).filter((a) => a.actif && a.role === 'EMPLOYEE' && !a.biometrie).length;

  const fini = (texte: string) => {
    setAction(null);
    setAvis({ ok: true, texte });
    charger();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 space-y-4">
        <Rubrique titre="Agents">
          <p className="text-sm text-encre-douce">
            {agents?.filter((a) => a.actif).length ?? '…'} compte(s) actif(s)
            {sansEmpreinte > 0 && <> · <strong className="font-bold text-soleil-encre">{sansEmpreinte} sans empreinte</strong></>}
          </p>
        </Rubrique>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Rechercher un agent</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-encre-pale" aria-hidden />
            <input className="champ pl-9" placeholder="Nom, matricule ou service" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-encre-douce">
            <input type="checkbox" className="h-4 w-4 accent-marine" checked={voirInactifs} onChange={(e) => setVoirInactifs(e.target.checked)} />
            Afficher les comptes désactivés
          </label>
        </div>

        {avis && <Avis ton={avis.ok ? 'ok' : 'erreur'}>{avis.texte}</Avis>}

        <div className="overflow-x-auto rounded-[6px] border border-marine-filet bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-marine">
                {['Matricule', 'Nom', 'Service', 'Profil', 'Empreinte', 'Actions'].map((t) => (
                  <th key={t} scope="col" className="rubrique px-3 py-2.5">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents === null && <tr><td colSpan={6} className="px-3 py-10 text-center text-encre-pale">Chargement…</td></tr>}
              {agents && !visibles.length && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-encre-douce">
                  {agents.length <= 1 ? 'Aucun agent pour l\'instant. Créez le premier compte avec le formulaire.' : 'Aucun agent ne correspond à la recherche.'}
                </td></tr>
              )}
              {visibles.map((a) => (
                <tr key={a.id} className={`border-b border-marine-filet/60 ${a.actif ? '' : 'bg-bureau/70 text-encre-pale'}`}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold">{a.matricule}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-semibold ${a.actif ? 'text-marine-nuit' : ''}`}>{a.nom}</span>
                    {!a.actif && <span className="ml-2"><Marqueur teinte="refus">Désactivé</Marqueur></span>}
                    {a.actif && a.doitChangerMdp && <span className="ml-2" title="L'agent doit changer son mot de passe à la prochaine connexion"><Marqueur teinte="marine">Mdp provisoire</Marqueur></span>}
                  </td>
                  <td className="px-3 py-2.5">{a.service ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{ROLES[a.role]}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {a.role !== 'EMPLOYEE' ? <span className="text-encre-pale">—</span> : a.biometrie ? <Marqueur teinte="citron">Enregistrée</Marqueur> : <Marqueur teinte="soleil">À enregistrer</Marqueur>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    {/* Les actions irréversibles sont tenues à l'écart des actions courantes */}
                    <div className="flex items-center gap-0.5">
                      <Lien onClick={() => setAction({ type: 'modifier', agent: a })}>Modifier</Lien>
                      <Lien onClick={() => setAction({ type: 'mdp', agent: a })}>Mot de passe</Lien>
                      {(a.biometrie || a.id !== me.id) && <span className="mx-3 h-5 w-px bg-marine-filet" aria-hidden />}
                      {a.biometrie && <Lien danger onClick={() => setAction({ type: 'empreinte', agent: a })}>Effacer l'empreinte</Lien>}
                      {a.id !== me.id && (a.actif
                        ? <Lien danger onClick={() => setAction({ type: 'actif', agent: a })}>Désactiver</Lien>
                        : <Lien onClick={() => setAction({ type: 'actif', agent: a })}>Réactiver</Lien>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="min-w-0 xl:pt-[46px]">
        <NouvelAgent services={services} onCree={(nom) => { setAvis({ ok: true, texte: `Compte créé pour ${nom}. Remettez-lui son matricule et son mot de passe provisoire.` }); charger(); }} />
      </aside>

      {action?.type === 'modifier' && <Modifier agent={action.agent} services={services} soiMeme={action.agent.id === me.id} onFermer={() => setAction(null)} onFait={fini} />}
      {action?.type === 'mdp' && <ReinitMdp agent={action.agent} onFermer={() => setAction(null)} onFait={fini} />}
      {action?.type === 'empreinte' && (
        <Confirmation
          titre="Réinitialiser l'empreinte"
          texte={`L'empreinte de ${action.agent.nom} sera effacée. À sa prochaine connexion, l'agent devra enregistrer à nouveau son empreinte sur son téléphone. Vérifiez son identité avant de continuer.`}
          bouton="Effacer l'empreinte"
          icone={<Fingerprint className="h-4 w-4" aria-hidden />}
          executer={() => api(`/admin/users/${action.agent.id}/credentials`, { method: 'DELETE' })}
          onFermer={() => setAction(null)}
          onFait={() => fini(`Empreinte de ${action.agent.nom} réinitialisée.`)}
        />
      )}
      {action?.type === 'actif' && (
        <Confirmation
          titre={action.agent.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
          texte={action.agent.actif
            ? `${action.agent.nom} ne pourra plus se connecter ni pointer. Ses pointages passés restent au registre.`
            : `${action.agent.nom} pourra de nouveau se connecter et pointer.`}
          bouton={action.agent.actif ? 'Désactiver' : 'Réactiver'}
          danger={action.agent.actif}
          executer={() => api(`/admin/users/${action.agent.id}`, { method: 'PATCH', body: { actif: !action.agent.actif } })}
          onFermer={() => setAction(null)}
          onFait={() => fini(`Compte de ${action.agent.nom} ${action.agent.actif ? 'désactivé' : 'réactivé'}.`)}
        />
      )}
    </div>
  );
}

function Lien({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-[4px] px-2 py-1 text-xs font-semibold ${danger ? 'border border-refus/30 text-refus hover:border-refus hover:bg-refus hover:text-white' : 'text-marine hover:bg-marine-clair'}`}>
      {children}
    </button>
  );
}

function NouvelAgent({ services, onCree }: { services: string[]; onCree: (nom: string) => void }) {
  const vide = { matricule: '', nom: '', service: '', role: 'EMPLOYEE' as Role, password: provisoire() };
  const [f, setF] = useState(vide);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      await api('/admin/users', { body: { ...f, matricule: f.matricule.trim().toUpperCase() } });
      onCree(f.nom);
      setF({ ...vide, password: provisoire() });
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-4 rounded-[6px] border border-marine-filet bg-white p-5 xl:sticky xl:top-4" noValidate>
      <h2 className="large flex items-center gap-2 border-b-2 border-marine pb-2.5 text-[15px] font-extrabold uppercase text-marine-nuit">
        <UserPlus className="h-4 w-4 text-marine" aria-hidden /> Nouveau compte
      </h2>
      <Libelle titre="Matricule">
        <input className="champ uppercase" value={f.matricule} onChange={(e) => setF({ ...f, matricule: e.target.value })} spellCheck={false} />
      </Libelle>
      <Libelle titre="Nom complet">
        <input className="champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
      </Libelle>
      <Libelle titre="Service">
        <input className="champ" list="services" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} />
        <datalist id="services">{services.map((s) => <option key={s} value={s} />)}</datalist>
      </Libelle>
      <Libelle titre="Profil">
        <select className="champ" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          {(Object.keys(ROLES) as Role[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
        </select>
      </Libelle>
      <Libelle titre="Mot de passe provisoire" aide="À remettre à l'agent ; il le changera à sa première connexion.">
        <div className="flex gap-2">
          <input className="champ font-semibold tracking-wide" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} spellCheck={false} autoComplete="off" />
          <Bouton type="button" variante="secondaire" onClick={() => setF({ ...f, password: provisoire() })} className="shrink-0 px-3" title="Générer un autre mot de passe">
            <KeyRound className="h-4 w-4" aria-hidden /><span className="sr-only">Générer</span>
          </Bouton>
        </div>
      </Libelle>
      {erreur && <Avis ton="erreur">{erreur}</Avis>}
      <Bouton type="submit" chargement={envoi} className="w-full">Créer le compte</Bouton>
    </form>
  );
}

function Fenetre({ titre, children, onFermer }: { titre: string; children: (fermer: () => void) => ReactNode; onFermer: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={onFermer} className="w-[min(480px,calc(100vw-24px))] overflow-hidden rounded-[8px] bg-white p-0 text-encre shadow-titre">
      <div className="relative overflow-hidden bg-marine px-6 py-4 text-white">
        <Ondes opacite={0.12} />
        <h2 className="large relative text-lg font-extrabold uppercase">{titre}</h2>
      </div>
      <div className="iris h-1.5" aria-hidden />
      <div className="space-y-4 p-6">{children(() => ref.current?.close())}</div>
    </dialog>
  );
}

function useEnvoi(executer: () => Promise<unknown>, onFait: () => void) {
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const go = async (e?: FormEvent) => {
    e?.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      await executer();
      onFait();
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return { erreur, envoi, go };
}

function Modifier({ agent, services, soiMeme, onFermer, onFait }: { agent: Agent; services: string[]; soiMeme: boolean; onFermer: () => void; onFait: (t: string) => void }) {
  const [f, setF] = useState({ nom: agent.nom, service: agent.service ?? '', role: agent.role });
  const { erreur, envoi, go } = useEnvoi(() => api(`/admin/users/${agent.id}`, { method: 'PATCH', body: f }), () => onFait(`Compte de ${f.nom} mis à jour.`));
  return (
    <Fenetre titre={`Modifier ${agent.matricule}`} onFermer={onFermer}>
      {(fermer) => (
        <form onSubmit={go} className="space-y-4" noValidate>
          <Libelle titre="Nom complet"><input className="champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} autoFocus /></Libelle>
          <Libelle titre="Service">
            <input className="champ" list="services-modif" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} />
            <datalist id="services-modif">{services.map((s) => <option key={s} value={s} />)}</datalist>
          </Libelle>
          <Libelle titre="Profil" aide={soiMeme ? 'Vous ne pouvez pas modifier votre propre profil.' : undefined}>
            <select className="champ" value={f.role} disabled={soiMeme} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {(Object.keys(ROLES) as Role[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
            </select>
          </Libelle>
          {erreur && <Avis ton="erreur">{erreur}</Avis>}
          <div className="flex justify-end gap-2">
            <Bouton type="button" variante="discret" onClick={fermer}>Annuler</Bouton>
            <Bouton type="submit" chargement={envoi}>Enregistrer</Bouton>
          </div>
        </form>
      )}
    </Fenetre>
  );
}

function ReinitMdp({ agent, onFermer, onFait }: { agent: Agent; onFermer: () => void; onFait: (t: string) => void }) {
  const [password, setPassword] = useState(provisoire);
  const [fait, setFait] = useState(false);
  const { erreur, envoi, go } = useEnvoi(() => api(`/admin/users/${agent.id}/password`, { body: { password } }), () => setFait(true));
  return (
    <Fenetre titre="Réinitialiser le mot de passe" onFermer={fait ? () => onFait(`Mot de passe de ${agent.nom} réinitialisé.`) : onFermer}>
      {(fermer) => fait ? (
        <div className="space-y-4">
          <p className="text-sm text-encre-douce">Remettez ce mot de passe provisoire à {agent.nom}. Il ne sera plus affiché.</p>
          <p className="border border-dashed border-marine bg-marine-clair/50 px-4 py-3 text-center text-xl font-bold tracking-[0.08em] text-marine-nuit select-all">{password}</p>
          <div className="flex justify-end"><Bouton onClick={fermer}>C'est noté</Bouton></div>
        </div>
      ) : (
        <form onSubmit={go} className="space-y-4" noValidate>
          <p className="text-sm text-encre-douce">
            {agent.nom} ({agent.matricule}) recevra un mot de passe provisoire et devra le changer à sa prochaine connexion.
          </p>
          <Libelle titre="Mot de passe provisoire">
            <input className="champ font-semibold tracking-wide" value={password} onChange={(e) => setPassword(e.target.value)} spellCheck={false} autoComplete="off" />
          </Libelle>
          {erreur && <Avis ton="erreur">{erreur}</Avis>}
          <div className="flex justify-end gap-2">
            <Bouton type="button" variante="discret" onClick={fermer}>Annuler</Bouton>
            <Bouton type="submit" chargement={envoi}>Réinitialiser</Bouton>
          </div>
        </form>
      )}
    </Fenetre>
  );
}

function Confirmation({ titre, texte, bouton, icone, danger, executer, onFermer, onFait }: {
  titre: string; texte: string; bouton: string; icone?: ReactNode; danger?: boolean;
  executer: () => Promise<unknown>; onFermer: () => void; onFait: () => void;
}) {
  const { erreur, envoi, go } = useEnvoi(executer, onFait);
  return (
    <Fenetre titre={titre} onFermer={onFermer}>
      {(fermer) => (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-encre-douce">{texte}</p>
          {erreur && <Avis ton="erreur">{erreur}</Avis>}
          <div className="flex justify-end gap-2">
            <Bouton variante="discret" onClick={fermer}>Annuler</Bouton>
            <Bouton variante={danger ? 'danger' : 'principal'} chargement={envoi} onClick={() => go()}>{icone}{bouton}</Bouton>
          </div>
        </div>
      )}
    </Fenetre>
  );
}
