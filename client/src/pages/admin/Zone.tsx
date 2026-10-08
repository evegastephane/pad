import { FormEvent, useEffect, useState } from 'react';
import { Crosshair, Plus } from 'lucide-react';
import { api, Zone as ZoneT } from '../../api';
import { Avis, Bouton, Libelle, Rubrique } from '../../ui/kit';

const distance = (a1: number, o1: number, a2: number, o2: number) => {
  const r = Math.PI / 180;
  const h = Math.sin(((a2 - a1) * r) / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(((o2 - o1) * r) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

const maPosition = () =>
  new Promise<GeolocationPosition>((ok, ko) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(ok, () => ko(new Error('Position indisponible : autorisez la localisation pour ce site.')), { enableHighAccuracy: true, timeout: 15000 })
      : ko(new Error('Ce navigateur ne donne pas accès à la position.')),
  );

export default function Zone() {
  const [z, setZ] = useState<ZoneT | null>(null);
  const [monIp, setMonIp] = useState('');
  const [avis, setAvis] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [essai, setEssai] = useState<{ m: number; precision: number } | null>(null);
  const [localise, setLocalise] = useState(false);

  useEffect(() => {
    api<ZoneT>('/admin/parametres')
      .then(({ monIp, ...zone }) => { setZ(zone); setMonIp(monIp ?? ''); })
      .catch((e) => setAvis({ ok: false, texte: e.message }));
  }, []);

  if (!z) return avis ? <Avis ton="erreur">{avis.texte}</Avis> : <p className="text-encre-pale">Chargement…</p>;

  const ips = z.ALLOWED_IPS.split(/[\s,]+/).filter(Boolean);
  const rayon = Number(z.ZONE_RADIUS) || 0;

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setAvis(null);
    setEnvoi(true);
    try {
      setZ(await api<ZoneT>('/admin/parametres', { method: 'PUT', body: z }));
      setAvis({ ok: true, texte: 'Zone de pointage enregistrée. Elle s\'applique immédiatement à tous les pointages.' });
    } catch (err) {
      setAvis({ ok: false, texte: (err as Error).message });
    } finally {
      setEnvoi(false);
    }
  };

  const centrerIci = async () => {
    setLocalise(true);
    try {
      const p = await maPosition();
      setZ({ ...z, ZONE_LAT: p.coords.latitude.toFixed(6), ZONE_LNG: p.coords.longitude.toFixed(6) });
      setEssai(null);
    } catch (e) {
      setAvis({ ok: false, texte: (e as Error).message });
    } finally {
      setLocalise(false);
    }
  };

  const tester = async () => {
    setLocalise(true);
    try {
      const p = await maPosition();
      setEssai({ m: distance(p.coords.latitude, p.coords.longitude, Number(z.ZONE_LAT), Number(z.ZONE_LNG)), precision: p.coords.accuracy });
    } catch (e) {
      setAvis({ ok: false, texte: (e as Error).message });
    } finally {
      setLocalise(false);
    }
  };

  // Échelle du schéma : le cercle occupe 70 % du cadre, le point d'essai est placé à sa distance réelle
  const echelle = 70 / Math.max(rayon, essai?.m ?? 0, 1);

  return (
    <div className="max-w-[1080px] space-y-5">
      <Rubrique titre="Zone de pointage">
        <p className="text-sm text-encre-douce">Un pointage n'est accepté que si les deux conditions sont réunies.</p>
      </Rubrique>

      <form onSubmit={enregistrer} className="grid gap-6 lg:grid-cols-2" noValidate>
        <fieldset className="space-y-4 rounded-[6px] border border-marine-filet bg-white p-5">
          <legend className="sr-only">Réseau</legend>
          <h3 className="large border-b-2 border-marine pb-2.5 text-[15px] font-extrabold uppercase text-marine-nuit">1. Réseau Wi-Fi de la Direction</h3>
          <Libelle titre="Adresses IP publiques autorisées" aide="Une adresse par ligne. C'est l'adresse sous laquelle le Wi-Fi de la Direction apparaît sur Internet (abonnement à IP fixe).">
            <textarea
              className="champ min-h-[110px] font-semibold"
              value={ips.join('\n')}
              onChange={(e) => setZ({ ...z, ALLOWED_IPS: e.target.value.split('\n').join(',') })}
              spellCheck={false}
            />
          </Libelle>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-marine-filet pt-3 text-sm">
            <span className="text-encre-douce">
              Votre adresse actuelle : <strong className="font-bold text-marine-nuit">{monIp || 'inconnue'}</strong>
              {monIp && ips.includes(monIp) && <span className="ml-1 text-citron-encre">(autorisée)</span>}
            </span>
            {monIp && !ips.includes(monIp) && (
              <Bouton type="button" variante="secondaire" className="py-1.5" onClick={() => setZ({ ...z, ALLOWED_IPS: [...ips, monIp].join(',') })}>
                <Plus className="h-4 w-4" aria-hidden /> Ajouter cette adresse
              </Bouton>
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-[6px] border border-marine-filet bg-white p-5">
          <legend className="sr-only">Zone GPS</legend>
          <h3 className="large border-b-2 border-marine pb-2.5 text-[15px] font-extrabold uppercase text-marine-nuit">2. Périmètre autour du site</h3>
          <div className="grid gap-5 sm:grid-cols-[1fr_170px]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Libelle titre="Latitude du centre"><input className="champ" inputMode="decimal" value={z.ZONE_LAT} onChange={(e) => setZ({ ...z, ZONE_LAT: e.target.value })} /></Libelle>
                <Libelle titre="Longitude du centre"><input className="champ" inputMode="decimal" value={z.ZONE_LNG} onChange={(e) => setZ({ ...z, ZONE_LNG: e.target.value })} /></Libelle>
              </div>
              <Libelle titre="Rayon (mètres)" aide="100 à 200 m recommandés : le GPS perd en précision à l'intérieur des bâtiments.">
                <input className="champ" inputMode="numeric" value={z.ZONE_RADIUS} onChange={(e) => setZ({ ...z, ZONE_RADIUS: e.target.value })} />
              </Libelle>
            </div>
            <figure className="flex flex-col items-center">
              <svg viewBox="0 0 200 200" className="w-full max-w-[170px]" role="img" aria-label={`Périmètre de ${rayon} mètres${essai ? `, votre position à ${Math.round(essai.m)} mètres` : ''}`}>
                <line x1="100" y1="8" x2="100" y2="192" stroke="#C9D6EA" strokeDasharray="2 4" />
                <line x1="8" y1="100" x2="192" y2="100" stroke="#C9D6EA" strokeDasharray="2 4" />
                <circle cx="100" cy="100" r={rayon * echelle} fill="#C5E91B" fillOpacity="0.22" stroke="#0A4DA2" strokeWidth="1.5" />
                <line x1="100" y1="100" x2={100 + rayon * echelle} y2="100" stroke="#0A4DA2" strokeWidth="1" />
                <text x={100 + (rayon * echelle) / 2} y="94" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B1F3A">{rayon} m</text>
                <rect x="96" y="96" width="8" height="8" fill="#0A4DA2" />
                {essai && (
                  <g>
                    <circle cx="100" cy={100 - essai.m * echelle} r="5" fill={essai.m <= rayon ? '#C5E91B' : '#B42318'} stroke="#0B1F3A" strokeWidth="1.5" />
                  </g>
                )}
              </svg>
              <figcaption className="mt-1 text-center text-[11px] text-encre-pale">Carré bleu : centre de la zone</figcaption>
            </figure>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-marine-filet pt-3">
            <Bouton type="button" variante="secondaire" className="py-1.5" onClick={centrerIci} disabled={localise}>
              <Crosshair className="h-4 w-4" aria-hidden /> Centrer sur ma position
            </Bouton>
            <Bouton type="button" variante="discret" className="py-1.5" onClick={tester} disabled={localise}>
              Tester ma position
            </Bouton>
          </div>
          {essai && (
            <Avis ton={essai.m <= rayon ? 'ok' : 'erreur'}>
              Vous êtes à {Math.round(essai.m)} m du centre (précision du GPS : ±{Math.round(essai.precision)} m) :{' '}
              {essai.m <= rayon ? 'dans la zone.' : 'hors de la zone.'}
            </Avis>
          )}
        </fieldset>

        <div className="space-y-3 lg:col-span-2">
          {avis && <Avis ton={avis.ok ? 'ok' : 'erreur'}>{avis.texte}</Avis>}
          <div className="flex justify-end">
            <Bouton type="submit" chargement={envoi}>Enregistrer la zone</Bouton>
          </div>
        </div>
      </form>
    </div>
  );
}
