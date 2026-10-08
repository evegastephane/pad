import { FormEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilePenLine, Printer, RefreshCw } from 'lucide-react';
import { Agent, api, Notif, NotifType, ouvrirPdf, Pointage } from '../../api';
import { aujourdhui, debutMois, duree, heure, horodatage, jourLong, lundi } from '../../format';
import { Ondes } from '../../ui/fiduciaire';
import { Avis, Bouton, Feuille, Libelle, Marqueur, Rubrique } from '../../ui/kit';

type Resume = { jour: string; agents: number; arrives: number; partis: number };
type Periode = { du: string; au: string };

const RACCOURCIS: { titre: string; p: () => Periode }[] = [
  { titre: "Aujourd'hui", p: () => ({ du: aujourdhui(), au: aujourdhui() }) },
  { titre: 'Hier', p: () => ({ du: aujourdhui(-1), au: aujourdhui(-1) }) },
  { titre: 'Cette semaine', p: () => ({ du: lundi(), au: aujourdhui() }) },
  { titre: 'Ce mois', p: () => ({ du: debutMois(), au: aujourdhui() }) },
];

const NOTIF: Record<NotifType, { titre: string; teinte: 'citron' | 'soleil' | 'refus' | 'marine' | 'neutre' }> = {
  ARRIVEE: { titre: 'Arrivée', teinte: 'citron' },
  DEPART: { titre: 'Départ', teinte: 'soleil' },
  REFUS: { titre: 'Refus', teinte: 'refus' },
  ENROLEMENT: { titre: 'Empreinte', teinte: 'marine' },
  REGULARISATION: { titre: 'Régul.', teinte: 'neutre' },
};

// Échelle de la journée de service (cahier des charges : 6 h à 20 h)
const DEBUT = 6 * 60;
const FIN = 20 * 60;
const minutesDouala = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 3600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
const pct = (m: number) => `${(Math.min(Math.max(m - DEBUT, 0), FIN - DEBUT) / (FIN - DEBUT)) * 100}%`;

export default function Registre() {
  const [periode, setPeriode] = useState<Periode>(RACCOURCIS[0].p());
  const [service, setService] = useState('');
  const [userId, setUserId] = useState('');
  const [lignes, setLignes] = useState<Pointage[] | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [erreur, setErreur] = useState('');
  const [majA, setMajA] = useState<Date | null>(null);
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [regul, setRegul] = useState<Partial<Regul> | null>(null);

  const qs = useMemo(() => new URLSearchParams({ ...periode, service, userId }).toString(), [periode, service, userId]);

  const charger = useCallback(async () => {
    try {
      const [l, n, r] = await Promise.all([
        api<Pointage[]>(`/admin/pointages?${qs}`),
        api<Notif[]>('/admin/notifications'),
        api<Resume>('/admin/aujourdhui'),
      ]);
      setLignes(l);
      setNotifs(n);
      setResume(r);
      setMajA(new Date());
      setErreur('');
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [qs]);

  useEffect(() => {
    charger();
    const t = setInterval(charger, 20000);
    return () => clearInterval(t);
  }, [charger]);

  useEffect(() => {
    api<Agent[]>('/admin/users').then((a) => setAgents(a.filter((x) => x.role === 'EMPLOYEE'))).catch(() => {});
    api<string[]>('/admin/services').then(setServices).catch(() => {});
  }, []);

  const parJour = useMemo(() => {
    const g = new Map<string, Pointage[]>();
    for (const l of lignes ?? []) g.set(l.jour, [...(g.get(l.jour) ?? []), l]);
    return [...g.entries()];
  }, [lignes]);

  const imprimer = async () => {
    setPdfEnCours(true);
    try {
      await ouvrirPdf(`/admin/pointages/pdf?${qs}`);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setPdfEnCours(false);
    }
  };

  const raccourciActif = RACCOURCIS.find((r) => {
    const p = r.p();
    return p.du === periode.du && p.au === periode.au;
  });
  const maintenant = minutesDouala(new Date().toISOString());

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 space-y-5">
        {resume && <Bordereau resume={resume} />}

        <Rubrique titre="Registre des présences">
          <div className="flex gap-2">
            <Bouton variante="secondaire" onClick={() => setRegul({ jour: aujourdhui() })}>
              <FilePenLine className="h-4 w-4" aria-hidden /> Régulariser
            </Bouton>
            <Bouton onClick={imprimer} chargement={pdfEnCours}>
              {!pdfEnCours && <Printer className="h-4 w-4" aria-hidden />} Relevé PDF
            </Bouton>
          </div>
        </Rubrique>

        {/* Critères de consultation */}
        <Feuille className="grid gap-x-4 gap-y-3 p-4 md:grid-cols-[auto_1fr]">
          <div className="md:col-span-2 flex flex-wrap gap-1" role="group" aria-label="Période rapide">
            {RACCOURCIS.map((r) => (
              <button
                key={r.titre}
                onClick={() => setPeriode(r.p())}
                aria-pressed={raccourciActif === r}
                className={`rounded-[4px] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  raccourciActif === r ? 'bg-marine text-white' : 'bg-marine-clair/60 text-marine-fonce hover:bg-marine-clair'
                }`}
              >
                {r.titre}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[320px]">
            <Libelle titre="Du">
              <input type="date" className="champ py-2" value={periode.du} max={periode.au || undefined} onChange={(e) => setPeriode({ ...periode, du: e.target.value })} />
            </Libelle>
            <Libelle titre="Au">
              <input type="date" className="champ py-2" value={periode.au} min={periode.du || undefined} onChange={(e) => setPeriode({ ...periode, au: e.target.value })} />
            </Libelle>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Libelle titre="Service">
              <select className="champ py-2" value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">Tous les services</option>
                {services.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Libelle>
            <Libelle titre="Agent">
              <select className="champ py-2" value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Tous les agents</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.nom} ({a.matricule})</option>)}
              </select>
            </Libelle>
          </div>
        </Feuille>

        {erreur && <Avis ton="erreur">{erreur}</Avis>}

        {/* Le registre */}
        <Feuille className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-marine">
                <th scope="col" className="rubrique px-4 py-3">Agent</th>
                <th scope="col" className="rubrique px-3 py-3">Service</th>
                <th scope="col" className="rubrique w-[34%] px-3 py-3">
                  <span className="flex justify-between"><span>Présence</span><span className="font-mono font-normal normal-case tracking-normal text-encre-pale">6 h · 13 h · 20 h</span></span>
                </th>
                <th scope="col" className="rubrique px-3 py-3 text-right">Arrivée</th>
                <th scope="col" className="rubrique px-3 py-3 text-right">Départ</th>
                <th scope="col" className="rubrique px-3 py-3 text-right">Durée</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            {lignes === null && (
              <tbody><tr><td colSpan={7} className="px-4 py-12 text-center text-encre-pale">Chargement du registre…</td></tr></tbody>
            )}
            {lignes?.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="font-semibold text-marine-nuit">Aucun pointage sur ces critères.</p>
                    <p className="mt-1 text-sm text-encre-douce">Élargissez la période ou retirez un filtre.</p>
                  </td>
                </tr>
              </tbody>
            )}
            {parJour.map(([jour, rows]) => {
              const estAujourdhui = jour.slice(0, 10) === aujourdhui();
              return (
                <Fragment key={jour}>
                  <tbody>
                    <tr className="bg-marine-clair/70">
                      <th colSpan={7} scope="rowgroup" className="px-4 py-2 text-left text-[13px] font-bold text-marine-fonce first-letter:uppercase">
                        {jourLong(jour)} <span className="font-medium text-encre-douce">· {rows.length} pointage(s)</span>
                      </th>
                    </tr>
                  </tbody>
                  {/* Au survol, la ligne se détache et le reste du registre s'estompe */}
                  <tbody className="[&:has(tr:hover)>tr:not(:hover)]:opacity-55">
                    {rows.map((l) => {
                      const a = minutesDouala(l.arrivee);
                      const d = l.depart ? minutesDouala(l.depart) : estAujourdhui ? maintenant : null;
                      return (
                        <tr key={l.id} className="border-b border-marine-filet/70 transition-opacity duration-150 hover:bg-[#FAFCFF]">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-marine-nuit">
                              {l.user.nom}
                              {l.regularise && (
                                <span className="ml-2 align-[1px]" title={l.motif ? `Motif : ${l.motif}` : undefined}>
                                  <Marqueur teinte="soleil">Régularisé</Marqueur>
                                </span>
                              )}
                            </p>
                            <p className="font-mono text-[11px] tracking-[0.06em] text-encre-pale">{l.user.matricule}</p>
                          </td>
                          <td className="px-3 py-3 text-encre-douce">{l.user.service ?? '—'}</td>
                          <td className="px-3 py-3">
                            <div className="relative h-3 rounded-[2px] bg-marine-clair/70" role="img" aria-label={`Présence de ${heure(l.arrivee)} à ${heure(l.depart) ?? 'maintenant'}`}>
                              <span className="absolute inset-y-0 left-1/2 w-px bg-marine-filet" aria-hidden />
                              {d !== null && (
                                <span
                                  className={`absolute inset-y-0 rounded-[2px] ${l.depart ? 'bg-marine' : 'bg-marine/45'}`}
                                  style={{ left: pct(a), width: `calc(${pct(d)} - ${pct(a)})` }}
                                />
                              )}
                              <span className="absolute -inset-y-1 w-[3px] rounded-full bg-citron ring-1 ring-citron-encre/40" style={{ left: pct(a) }} />
                              {l.depart && <span className="absolute -inset-y-1 w-[3px] -translate-x-full rounded-full bg-soleil ring-1 ring-soleil-encre/40" style={{ left: pct(minutesDouala(l.depart)) }} />}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-[15px] font-bold">{heure(l.arrivee)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-[15px] font-bold">
                            {heure(l.depart) ?? <span className="text-xs font-semibold uppercase tracking-[0.06em] text-marine/60">En poste</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-encre-douce">{duree(l.duree) ?? '—'}</td>
                          <td className="w-px whitespace-nowrap px-3 py-2 text-right">
                            <button
                              onClick={() => setRegul({ userId: l.userId, jour: l.jour.slice(0, 10), arrivee: heure(l.arrivee) ?? '', depart: heure(l.depart) ?? '' })}
                              className="rounded-[4px] px-2 py-1 text-xs font-semibold text-marine hover:bg-marine-clair"
                            >
                              Corriger
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Fragment>
              );
            })}
          </table>
        </Feuille>
        {majA && (
          <p className="flex items-center gap-1.5 text-xs text-encre-pale">
            <RefreshCw className="h-3 w-3" aria-hidden /> Mis à jour à {majA.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}, actualisation automatique.
          </p>
        )}
      </section>

      {/* Main courante : les événements au fil de l'eau */}
      <aside className="min-w-0">
        <Feuille className="overflow-hidden xl:sticky xl:top-4">
          <div className="flex items-baseline justify-between border-b-2 border-marine px-4 py-3">
            <h2 className="large text-[15px] font-extrabold uppercase text-marine-nuit">Main courante</h2>
            <span className="flex items-center gap-1.5 text-xs text-encre-pale">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-citron ring-2 ring-citron/30" aria-hidden /> En direct
            </span>
          </div>
          <ol className="max-h-[72vh] divide-y divide-marine-filet/60 overflow-y-auto" aria-live="polite">
            {notifs.map((n) => (
              <li key={n.id} className="grid grid-cols-[46px_1fr] gap-x-3 px-4 py-2.5">
                <span className="pt-px font-mono text-[11px] text-encre-pale">{horodatage(n.createdAt).split(' ')[1]}</span>
                <div className="min-w-0">
                  <Marqueur teinte={NOTIF[n.type].teinte}>{NOTIF[n.type].titre}</Marqueur>
                  <p className={`mt-1 text-[13px] leading-snug ${n.type === 'REFUS' ? 'font-medium text-refus' : 'text-encre'}`}>{n.message}</p>
                  <p className="font-mono text-[10.5px] text-encre-pale">{horodatage(n.createdAt).split(' ')[0]}</p>
                </div>
              </li>
            ))}
            {!notifs.length && <li className="px-4 py-10 text-center text-sm text-encre-pale">Aucun événement pour l'instant.</li>}
          </ol>
        </Feuille>
      </aside>

      {regul && <Regularisation initial={regul} agents={agents} onFermer={() => setRegul(null)} onFait={() => { setRegul(null); charger(); }} />}
    </div>
  );
}

/* Bordereau du jour : une case par agent actif, colorée selon son état */
function Bordereau({ resume }: { resume: Resume }) {
  const enPoste = resume.arrives - resume.partis;
  const absents = Math.max(resume.agents - resume.arrives, 0);
  const cases = [
    ...Array(enPoste).fill('bg-citron'),
    ...Array(resume.partis).fill('bg-soleil'),
    ...Array(absents).fill('bg-white/15 ring-1 ring-inset ring-white/35'),
  ];
  return (
    <div className="relative overflow-hidden rounded-[6px] bg-marine-nuit text-white">
      <Ondes opacite={0.09} />
      <div className="relative grid gap-5 px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="rubrique !text-white/60">Bordereau du jour</p>
          <p className="large mt-1 text-[22px] font-extrabold uppercase leading-tight first-letter:uppercase">{jourLong(resume.jour)}</p>
          <div className="mt-4 flex flex-wrap gap-1" role="img" aria-label={`${enPoste} en poste, ${resume.partis} partis, ${absents} pas encore pointés`}>
            {cases.map((c, i) => <span key={i} className={`h-5 w-3.5 rounded-[2px] ${c}`} />)}
          </div>
        </div>
        <dl className="flex gap-6 text-sm">
          <Compte teinte="bg-citron" nombre={enPoste} libelle="en poste" />
          <Compte teinte="bg-soleil" nombre={resume.partis} libelle="partis" />
          <Compte teinte="bg-white/30" nombre={absents} libelle="non pointés" />
        </dl>
      </div>
    </div>
  );
}

function Compte({ teinte, nombre, libelle }: { teinte: string; nombre: number; libelle: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-white/70"><span className={`h-2 w-2 rounded-[1px] ${teinte}`} aria-hidden />{libelle}</dt>
      <dd className="text-[26px] font-extrabold leading-tight">{nombre}</dd>
    </div>
  );
}

type Regul = { userId: number; jour: string; arrivee: string; depart: string; motif: string };

function Regularisation({ initial, agents, onFermer, onFait }: { initial: Partial<Regul>; agents: Agent[]; onFermer: () => void; onFait: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [f, setF] = useState({ userId: String(initial.userId ?? ''), jour: initial.jour ?? aujourdhui(), arrivee: initial.arrivee ?? '', depart: initial.depart ?? '', motif: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (!f.userId) return setErreur("Choisissez l'agent concerné.");
    setEnvoi(true);
    try {
      await api('/admin/pointages/regulariser', { body: { ...f, userId: Number(f.userId), depart: f.depart || null } });
      onFait();
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <dialog ref={ref} onClose={onFermer} className="w-[min(540px,calc(100vw-24px))] overflow-hidden rounded-[8px] bg-white p-0 text-encre shadow-titre">
      <div className="relative overflow-hidden bg-marine px-6 py-4 text-white">
        <Ondes opacite={0.12} />
        <h2 className="large relative text-lg font-extrabold uppercase">Régulariser un pointage</h2>
      </div>
      <div className="iris h-1.5" aria-hidden />
      <form onSubmit={soumettre} className="space-y-4 p-6" noValidate>
        <p className="text-sm leading-relaxed text-encre-douce">
          Pour un oubli ou une panne. La ligne sera marquée « Régularisé » au registre et au relevé, et l'opération inscrite au journal.
        </p>
        <Libelle titre="Agent">
          <select className="champ" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} autoFocus>
            <option value="">Choisir un agent…</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.nom} ({a.matricule})</option>)}
          </select>
        </Libelle>
        <div className="grid grid-cols-3 gap-3">
          <Libelle titre="Date">
            <input type="date" className="champ px-2" value={f.jour} max={aujourdhui()} onChange={(e) => setF({ ...f, jour: e.target.value })} />
          </Libelle>
          <Libelle titre="Arrivée">
            <input type="time" className="champ px-2" value={f.arrivee} onChange={(e) => setF({ ...f, arrivee: e.target.value })} />
          </Libelle>
          <Libelle titre="Départ">
            <input type="time" className="champ px-2" value={f.depart} onChange={(e) => setF({ ...f, depart: e.target.value })} />
          </Libelle>
        </div>
        <Libelle titre="Motif" aide="Obligatoire. Exemple : panne du réseau Wi-Fi, constatée par le chef de service.">
          <textarea className="champ min-h-[84px] resize-y" value={f.motif} onChange={(e) => setF({ ...f, motif: e.target.value })} />
        </Libelle>
        {erreur && <Avis ton="erreur">{erreur}</Avis>}
        <div className="flex justify-end gap-2 pt-1">
          <Bouton type="button" variante="discret" onClick={() => ref.current?.close()}>Annuler</Bouton>
          <Bouton type="submit" chargement={envoi}>Inscrire la régularisation</Bouton>
        </div>
      </form>
    </dialog>
  );
}
