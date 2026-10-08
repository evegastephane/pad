import { CSSProperties, useMemo } from 'react';

/* ------------------------------------------------------------------
   Motifs d'impression fiduciaire, calculés en SVG (aucune image) :
   rosette guillochée propre à chaque agent, ondes de fond, micro-texte,
   bande iris et sceau circulaire.
------------------------------------------------------------------- */

// Graine stable à partir d'un texte (FNV-1a), puis générateur pseudo-aléatoire
const graine = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const aleatoire = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Anneau = { r0: number; a: number; n: number; b: number; m: number; copies: number };

// Une courbe polaire ondulée, répétée en copies légèrement tournées : le moiré du guilloché
function courbes({ r0, a, n, b, m, copies }: Anneau, pas = 220) {
  const d: string[] = [];
  for (let k = 0; k < copies; k++) {
    const rot = (k / copies) * ((2 * Math.PI) / n);
    let p = '';
    for (let i = 0; i <= pas; i++) {
      const t = (i / pas) * 2 * Math.PI;
      const r = r0 + a * Math.sin(n * t) + b * Math.sin(m * t);
      const x = 100 + 100 * r * Math.cos(t + rot);
      const y = 100 + 100 * r * Math.sin(t + rot);
      p += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d.push(p + 'Z');
  }
  return d;
}

export type EtatRosette = 'vierge' | 'arrivee' | 'complete';

/* Rosette du titre : chaque matricule donne un motif différent.
   vierge : simple empreinte pâle ; arrivee : anneaux bleus tracés ; complete : anneau iris ajouté. */
export function Rosette({ cle, etat, anime = false, surAplat = false, className = '', style }: { cle: string; etat: EtatRosette; anime?: boolean; surAplat?: boolean; className?: string; style?: CSSProperties }) {
  const anneaux = useMemo(() => {
    const rnd = aleatoire(graine(cle));
    const choix = (l: number[]) => l[Math.floor(rnd() * l.length)];
    const ext: Anneau = { r0: 0.84, a: 0.055, n: choix([10, 11, 12, 13]), b: 0.018, m: choix([31, 33, 35]), copies: 20 };
    const mil: Anneau = { r0: 0.6, a: 0.11, n: choix([6, 7, 8]), b: 0.03, m: choix([17, 19, 21]), copies: 16 };
    const int: Anneau = { r0: 0.33, a: 0.09, n: choix([5, 6, 7]), b: 0.02, m: choix([13, 15]), copies: 12 };
    return { ext: courbes(ext), mil: courbes(mil), int: courbes(int) };
  }, [cle]);

  const vierge = etat === 'vierge';
  const trace = (i: number, base: number) =>
    anime ? { className: 'trace', style: { animationDelay: `${base + i * 18}ms` } as CSSProperties } : {};

  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`iris-${cle}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0A4DA2" />
          <stop offset="0.45" stopColor="#4FA9DE" />
          <stop offset="0.75" stopColor="#9DC814" />
          <stop offset="1" stopColor="#E0A800" />
        </linearGradient>
      </defs>
      {/* Sur un aplat bleu, le motif passe en filets blancs */}
      <g fill="none" strokeWidth="0.32" strokeLinejoin="round" style={surAplat ? { filter: 'brightness(0) invert(1)', opacity: 0.45 } : undefined}>
        <g stroke={vierge ? '#C9D6EA' : '#0A4DA2'} opacity={vierge ? 0.9 : 1}>
          {anneaux.mil.map((d, i) => <path key={i} d={d} pathLength={1} {...(anime && etat === 'arrivee' ? trace(i, 0) : {})} />)}
          {anneaux.int.map((d, i) => <path key={i} d={d} pathLength={1} {...(anime && etat === 'arrivee' ? trace(i, 250) : {})} />)}
        </g>
        <g stroke={etat === 'complete' ? `url(#iris-${cle})` : '#C9D6EA'} opacity={etat === 'complete' ? 1 : vierge ? 0.9 : 0.75}>
          {anneaux.ext.map((d, i) => <path key={i} d={d} pathLength={1} {...(anime && etat === 'complete' ? trace(i, 0) : {})} />)}
        </g>
        <circle cx="100" cy="100" r="22" stroke={vierge ? '#C9D6EA' : '#0A4DA2'} strokeWidth="0.6" />
        <circle cx="100" cy="100" r="24.5" stroke={vierge ? '#C9D6EA' : '#0A4DA2'} strokeWidth="0.3" />
      </g>
    </svg>
  );
}

/* Ondes croisées de fond, pour les bandeaux d'aplat */
export function Ondes({ couleur = '#FFFFFF', opacite = 0.13, lignes = 22, className = '' }: { couleur?: string; opacite?: number; lignes?: number; className?: string }) {
  const d = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < lignes; i++) {
      for (const sens of [1, -1]) {
        let p = '';
        for (let x = 0; x <= 1200; x += 8) {
          const y = (i / (lignes - 1)) * 200 + sens * 9 * Math.sin((x / 1200) * 2 * Math.PI * 7 + i * 0.5) + 4 * Math.sin((x / 1200) * 2 * Math.PI * 23);
          p += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)}`;
        }
        out.push(p);
      }
    }
    return out.join('');
  }, [lignes]);
  return (
    <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden>
      <path d={d} fill="none" stroke={couleur} strokeOpacity={opacite} strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* Ligne de micro-texte : sécurité d'impression, purement décorative */
export function MicroTexte({ texte = 'PORT AUTONOME DE DOUALA', className = '' }: { texte?: string; className?: string }) {
  return (
    <div className={`overflow-hidden whitespace-nowrap text-[5.5px] font-semibold uppercase leading-none tracking-[0.18em] ${className}`} aria-hidden>
      {Array.from({ length: 40 }, () => `${texte} · `).join('')}
    </div>
  );
}

export function Iris({ className = '' }: { className?: string }) {
  return <div className={`iris h-1.5 w-full ${className}`} aria-hidden />;
}

/* Sceau circulaire posé sur le titre */
export function Sceau({ haut, bas, centre, teinte = 'marine', anime = false, className = '' }: { haut: string; bas: string; centre: string; teinte?: 'marine' | 'citron'; anime?: boolean; className?: string }) {
  const id = useMemo(() => `s${Math.random().toString(36).slice(2, 8)}`, []);
  const encre = teinte === 'citron' ? '#3F4B05' : '#0A4DA2';
  const fond = teinte === 'citron' ? '#C5E91B' : '#FFFFFF';
  return (
    <svg viewBox="0 0 120 120" className={`${anime ? 'animate-sceau' : '-rotate-[8deg]'} ${className}`} role="img" aria-label={`${haut} ${centre} ${bas}`}>
      <defs>
        <path id={`${id}h`} d="M 18 60 A 42 42 0 0 1 102 60" />
        <path id={`${id}b`} d="M 14 60 A 46 46 0 0 0 106 60" />
      </defs>
      <circle cx="60" cy="60" r="57" fill={fond} stroke={encre} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="51" fill="none" stroke={encre} strokeWidth="0.8" />
      <circle cx="60" cy="60" r="31" fill="none" stroke={encre} strokeWidth="0.8" />
      <text fill={encre} fontSize="9.5" fontWeight="700" letterSpacing="2.2" style={{ fontStretch: '115%' }}>
        <textPath href={`#${id}h`} startOffset="50%" textAnchor="middle">{haut}</textPath>
      </text>
      <text fill={encre} fontSize="9.5" fontWeight="700" letterSpacing="2.2" style={{ fontStretch: '115%' }}>
        <textPath href={`#${id}b`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">{bas}</textPath>
      </text>
      <text x="60" y="66" textAnchor="middle" fill={encre} fontSize="17" fontWeight="800">{centre}</text>
    </svg>
  );
}
