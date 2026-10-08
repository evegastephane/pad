import { ReactNode, useState } from 'react';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { Check, Fingerprint, LoaderCircle, LogOut, MapPin, Wifi, X } from 'lucide-react';
import { api, Me } from '../api';
import { heure } from '../format';
import { Iris, MicroTexte, Rosette, Sceau } from '../ui/fiduciaire';
import { Avis, Bandeau, Bouton, Embleme } from '../ui/kit';

type Etat = 'attente' | 'cours' | 'ok' | 'echec';
type Controles = { reseau: Etat; zone: Etat; empreinte: Etat };
const REPOS: Controles = { reseau: 'attente', zone: 'attente', empreinte: 'attente' };

const position = () =>
  new Promise<GeolocationPosition>((ok, ko) => {
    if (!navigator.geolocation) return ko(new Error("Ce navigateur ne donne pas accès à la position. Utilisez Chrome ou Safari."));
    navigator.geolocation.getCurrentPosition(
      ok,
      (e) =>
        ko(new Error(e.code === e.PERMISSION_DENIED
          ? 'Autorisez la localisation pour ce site dans les réglages du navigateur, puis réessayez.'
          : 'Position introuvable. Activez la localisation du téléphone et réessayez.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });

// Erreurs du capteur traduites pour l'agent
const messageCapteur = (e: unknown) => {
  const n = (e as Error)?.name;
  if (n === 'NotAllowedError') return 'Vérification annulée ou délai dépassé. Appuyez à nouveau et posez votre doigt sur le capteur.';
  if (n === 'InvalidStateError') return 'Cette empreinte est déjà enregistrée sur ce téléphone.';
  if (n === 'SecurityError') return "Connexion non sécurisée : l'empreinte exige une adresse en https.";
  return (e as Error)?.message || "Le capteur n'a pas répondu.";
};

const TZ = 'Africa/Douala';
const maintenant = () => new Date();
const dateLongue = (d: Date) => {
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const aaaammjj = (d: Date) => new Date(d.getTime() + 3600_000).toISOString().slice(0, 10).replace(/-/g, '');

// Zone lisible par machine, à la manière d'un passeport : des données réelles, rien d'inventé
const ligneMachine = (texte: string) => (texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9<]/g, '<') + '<'.repeat(36)).slice(0, 36);

export default function Pointage({ me, recharger, onSortir }: { me: Me; recharger: () => Promise<void>; onSortir: () => void }) {
  const [busy, setBusy] = useState(false);
  const [ctrl, setCtrl] = useState<Controles>(REPOS);
  const [resultat, setResultat] = useState<{ ok: boolean; texte: string } | null>(null);
  const [vientDe, setVientDe] = useState<'ARRIVEE' | 'DEPART' | null>(null);
  const compatible = browserSupportsWebAuthn();

  const arrivee = heure(me.aujourdhui?.arrivee);
  const depart = heure(me.aujourdhui?.depart);
  const termine = Boolean(arrivee && depart);
  const etatTitre = termine ? 'complete' : arrivee ? 'arrivee' : 'vierge';
  const jour = maintenant();
  const serie = `${me.matricule.replace(/[^A-Z0-9]/gi, '')}·${aaaammjj(jour).slice(2)}`;

  const enregistrer = async () => {
    setBusy(true);
    setResultat(null);
    try {
      const optionsJSON = await api<any>('/webauthn/register/options', { method: 'POST' });
      const reponse = await startRegistration({ optionsJSON }).catch((e) => { throw new Error(messageCapteur(e)); });
      await api('/webauthn/register/verify', { body: reponse });
      await recharger();
      setResultat({ ok: true, texte: 'Empreinte enregistrée. Vous pouvez maintenant pointer votre arrivée.' });
    } catch (e) {
      setResultat({ ok: false, texte: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const pointer = async () => {
    setBusy(true);
    setResultat(null);
    setVientDe(null);
    setCtrl({ ...REPOS, zone: 'cours' });
    let etape: 'client' | 'serveur' = 'client';
    let fautif: keyof Controles = 'zone';
    try {
      const pos = await position();
      fautif = 'empreinte';
      setCtrl({ ...REPOS, zone: 'cours', empreinte: 'cours' });
      const optionsJSON = await api<any>('/pointage/options', { method: 'POST' });
      const assertion = await startAuthentication({ optionsJSON }).catch((e) => { throw new Error(messageCapteur(e)); });
      setCtrl({ reseau: 'cours', zone: 'cours', empreinte: 'cours' });
      etape = 'serveur';
      const r = await api<{ type: 'ARRIVEE' | 'DEPART' }>('/pointage', {
        body: { assertion, lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
      setCtrl({ reseau: 'ok', zone: 'ok', empreinte: 'ok' });
      await recharger();
      setVientDe(r.type);
      setResultat({ ok: true, texte: r.type === 'ARRIVEE' ? 'Arrivée enregistrée. Bonne journée.' : 'Départ enregistré. Votre journée est close.' });
    } catch (e) {
      const texte = (e as Error).message;
      const n: Controles = { ...REPOS };
      if (etape === 'serveur') {
        // Le serveur contrôle dans l'ordre : réseau, zone, empreinte
        fautif = /wi-fi/i.test(texte) ? 'reseau' : /zone|gps/i.test(texte) ? 'zone' : 'empreinte';
        const ordre: (keyof Controles)[] = ['reseau', 'zone', 'empreinte'];
        ordre.slice(0, ordre.indexOf(fautif)).forEach((k) => (n[k] = 'ok'));
      }
      n[fautif] = 'echec';
      setCtrl(n);
      setResultat({ ok: false, texte });
    } finally {
      setBusy(false);
    }
  };

  const action = !me.biometrie
    ? { texte: 'Enregistrer mon empreinte', go: enregistrer }
    : !arrivee
      ? { texte: 'Pointer mon arrivée', go: pointer }
      : !depart
        ? { texte: 'Pointer mon départ', go: pointer }
        : { texte: 'Journée terminée', go: pointer };

  return (
    <div className="flex min-h-dvh flex-col bg-bureau">
      <Bandeau iris={false} className="px-4 pb-12 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Embleme taille={42} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/75">Port Autonome de Douala</p>
            <p className="whitespace-nowrap text-[18px] font-extrabold uppercase [font-stretch:115%]">Titre de présence</p>
          </div>
          <button onClick={onSortir} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] text-white/80 hover:bg-white/10 hover:text-white" aria-label="Se déconnecter" title="Se déconnecter">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </Bandeau>

      <main className="mx-auto -mt-8 flex w-full max-w-md flex-1 flex-col px-3 pb-3">
        {/* Le titre du jour */}
        <article className="relative overflow-hidden rounded-[8px] bg-white shadow-titre" aria-label="Titre de présence du jour">
          <Iris />
          <MicroTexte className="mt-1.5 px-3 text-marine/35" />
          <header className="flex items-start justify-between gap-3 px-4 pb-1 pt-3">
            <div className="min-w-0">
              <p className="rubrique">Titulaire</p>
              <p className="mt-0.5 truncate text-[20px] font-bold leading-tight text-marine-nuit">{me.nom}</p>
              <p className="text-[13px] text-encre-douce">
                {me.matricule}
                {me.service && <> · {me.service}</>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="rubrique">N°</p>
              <p className="mt-0.5 font-mono text-[12px] font-medium tracking-[0.08em] text-refus">{serie}</p>
            </div>
          </header>

          <div className="relative mx-auto my-1 aspect-square w-[min(232px,64vw)]">
            <Rosette cle={me.matricule} etat={etatTitre} anime={vientDe !== null} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              {etatTitre === 'vierge' ? (
                <div className="flex flex-col items-center text-center">
                  <Fingerprint className="h-7 w-7 text-marine/45" aria-hidden />
                  <p className="rubrique mt-1 !text-[9.5px]">{me.biometrie ? 'À délivrer' : 'À activer'}</p>
                </div>
              ) : (
                <Sceau
                  haut={termine ? 'JOURNÉE CLOSE' : 'VÉRIFIÉ'}
                  bas="PORT DE DOUALA"
                  centre={`${aaaammjj(jour).slice(6, 8)}.${aaaammjj(jour).slice(4, 6)}`}
                  teinte={termine ? 'citron' : 'marine'}
                  anime={vientDe !== null}
                  className="h-[46%] w-[46%] drop-shadow-sm [animation-delay:900ms]"
                />
              )}
            </div>
          </div>
          <p className="pb-3 text-center text-[13px] font-medium text-encre-douce">{dateLongue(jour)}</p>

          {/* Talons arrivée / départ, détachés par une perforation */}
          <div className="relative grid grid-cols-2 border-t border-dashed border-marine/30">
            <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-bureau" aria-hidden />
            <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-bureau" aria-hidden />
            <Talon libelle="Arrivée" teinte="bg-citron" valeur={arrivee} nouveau={vientDe === 'ARRIVEE'} />
            <Talon libelle="Départ" teinte="bg-soleil" valeur={depart} nouveau={vientDe === 'DEPART'} separe />
          </div>

          <div className="bg-marine-clair/60 px-4 py-2.5 font-mono text-[11px] leading-[1.5] tracking-[0.12em] text-marine-fonce/70" aria-hidden>
            <p className="truncate">{ligneMachine(`PAD<${me.matricule}<<${me.nom.replace(/\s+/g, '<')}`)}</p>
            <p className="truncate">{ligneMachine(`${aaaammjj(jour)}<ARR${(arrivee ?? '').replace(':', '')}<DEP${(depart ?? '').replace(':', '')}`)}</p>
          </div>
        </article>

        {/* Contrôles effectués à chaque pointage */}
        {me.biometrie && !termine && (
          <section className="mt-4 px-1" aria-label="Contrôles du pointage">
            <p className="rubrique">Contrôles du pointage</p>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              <Controle icone={<Wifi className="h-[18px] w-[18px]" />} titre="Wi-Fi Direction" etat={ctrl.reseau} />
              <Controle icone={<MapPin className="h-[18px] w-[18px]" />} titre="Zone du site" etat={ctrl.zone} />
              <Controle icone={<Fingerprint className="h-[18px] w-[18px]" />} titre="Empreinte" etat={ctrl.empreinte} />
            </ul>
          </section>
        )}

        {!me.biometrie && (
          <section className="mt-4 rounded-[6px] border border-marine-filet bg-white px-4 py-3.5 text-sm leading-relaxed text-encre-douce">
            <p className="font-semibold text-marine-nuit">Première utilisation</p>
            <p className="mt-1">
              Enregistrez votre empreinte une seule fois, sur votre propre téléphone. Elle reste dans le téléphone : le Port ne
              reçoit qu'une clé de vérification.
            </p>
          </section>
        )}

        {termine && <p className="mt-4 px-1 text-center text-sm text-encre-douce">Prochain pointage demain, à votre arrivée.</p>}

        <div className="flex-1" />

        {/* Action, à portée de pouce */}
        <div className="sticky bottom-0 -mx-3 mt-4 space-y-2.5 bg-gradient-to-t from-bureau from-70% to-bureau/0 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-4">
          {resultat && <Avis ton={resultat.ok ? 'ok' : 'erreur'}>{resultat.texte}</Avis>}
          {!compatible && <Avis ton="erreur">Ce navigateur ne gère pas l'empreinte. Ouvrez l'application dans Chrome (Android) ou Safari (iPhone).</Avis>}
          {!termine && (
            <Bouton onClick={action.go} disabled={!compatible} chargement={busy} className="min-h-[60px] w-full rounded-[6px] text-[17px] shadow-titre">
              {!busy && <Fingerprint className="h-6 w-6" aria-hidden />}
              {busy ? 'Vérification en cours…' : action.texte}
            </Bouton>
          )}
        </div>
      </main>
    </div>
  );
}

function Talon({ libelle, teinte, valeur, nouveau, separe }: { libelle: string; teinte: string; valeur: string | null; nouveau: boolean; separe?: boolean }) {
  return (
    <div className={`px-4 py-3.5 ${separe ? 'border-l border-dashed border-marine/30' : ''}`}>
      <p className="rubrique flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-[1px] ${teinte}`} aria-hidden />
        {libelle}
      </p>
      {valeur ? (
        <p key={valeur} className={`mt-1 text-[40px] font-extrabold leading-none tracking-[-0.02em] text-marine-nuit ${nouveau ? 'animate-impression [animation-delay:700ms]' : ''}`}>
          {valeur}
        </p>
      ) : (
        <p className="mt-1 text-[40px] font-light leading-none tracking-[-0.02em] text-marine-filet" aria-label="Non pointé">
          --:--
        </p>
      )}
    </div>
  );
}

function Controle({ icone, titre, etat }: { icone: ReactNode; titre: string; etat: Etat }) {
  const styles = {
    attente: 'border-marine-filet bg-white text-marine',
    cours: 'border-marine/40 bg-marine-clair text-marine',
    ok: 'border-citron bg-citron-pale text-citron-encre',
    echec: 'border-refus/50 bg-refus-pale text-refus',
  }[etat];
  const marque = {
    attente: null,
    cours: <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-label="En cours" />,
    ok: <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label="Validé" />,
    echec: <X className="h-3.5 w-3.5" strokeWidth={3} aria-label="Refusé" />,
  }[etat];
  return (
    <li className={`flex flex-col gap-1.5 rounded-[6px] border px-2.5 py-2 transition-colors duration-200 ${styles}`}>
      <span className="flex items-center justify-between">
        {icone}
        {marque}
      </span>
      <span className="text-[12px] font-semibold leading-tight">{titre}</span>
    </li>
  );
}
