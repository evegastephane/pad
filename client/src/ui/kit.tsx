import { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Iris, Ondes } from './fiduciaire';

/* Emblème : le logo sur sa pastille blanche, comme l'armoirie d'un document officiel */
export function Embleme({ taille = 44 }: { taille?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[6px] bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]" style={{ width: taille, height: taille }}>
      <img src="/logo-pad.png" alt="Port Autonome de Douala" style={{ width: taille * 0.86, height: taille * 0.86 }} />
    </span>
  );
}

/* Bandeau d'aplat bleu guilloché, avec la bande iris dessous */
export function Bandeau({ children, className = '', iris = true }: { children: ReactNode; className?: string; iris?: boolean }) {
  return (
    <div className="relative">
      <div className={`relative overflow-hidden bg-marine text-white ${className}`}>
        <Ondes />
        <div className="relative">{children}</div>
      </div>
      {iris && <Iris />}
    </div>
  );
}

type Teinte = 'citron' | 'soleil' | 'refus' | 'marine' | 'neutre';
const TEINTES: Record<Teinte, string> = {
  citron: 'bg-citron text-citron-encre',
  soleil: 'bg-soleil text-soleil-encre',
  refus: 'bg-refus text-white',
  marine: 'bg-marine text-white',
  neutre: 'bg-marine-clair text-marine-fonce',
};

export function Marqueur({ teinte, children }: { teinte: Teinte; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-[3px] px-1.5 py-[3px] text-[10px] font-bold uppercase leading-none tracking-[0.1em] ${TEINTES[teinte]}`} style={{ fontStretch: '110%' }}>
      {children}
    </span>
  );
}

type Variante = 'principal' | 'secondaire' | 'discret' | 'danger' | 'clair';
const VARIANTES: Record<Variante, string> = {
  principal: 'bg-marine text-white hover:bg-marine-fonce active:bg-marine-nuit disabled:bg-marine/35',
  secondaire: 'border border-marine/40 bg-white text-marine hover:border-marine hover:bg-marine-clair disabled:opacity-50',
  discret: 'text-marine hover:bg-marine-clair disabled:opacity-50',
  danger: 'border border-refus/35 bg-white text-refus hover:border-refus hover:bg-refus hover:text-white disabled:opacity-50',
  clair: 'border border-white/30 text-white hover:bg-white/10 disabled:opacity-50',
};

export function Bouton({
  variante = 'principal',
  chargement = false,
  className = '',
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; chargement?: boolean }) {
  return (
    <button
      {...p}
      disabled={p.disabled || chargement}
      className={`inline-flex items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
    >
      {chargement && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Libelle({ titre, aide, children, className = '' }: { titre: string; aide?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="rubrique mb-1.5 block">{titre}</span>
      {children}
      {aide && <span className="mt-1.5 block text-xs leading-relaxed text-encre-pale">{aide}</span>}
    </label>
  );
}

export function Avis({ ton, children }: { ton: 'ok' | 'erreur' | 'info'; children: ReactNode }) {
  const s = {
    ok: 'bg-citron-pale text-citron-encre [--trait:#9DC814]',
    erreur: 'bg-refus-pale text-refus [--trait:#B42318]',
    info: 'bg-marine-clair text-marine-fonce [--trait:#0A4DA2]',
  }[ton];
  return (
    <p role={ton === 'erreur' ? 'alert' : 'status'} className={`rounded-[4px] px-3.5 py-2.5 text-sm leading-snug shadow-[inset_0_0_0_1px_var(--trait)] animate-impression ${s}`}>
      {children}
    </p>
  );
}

/* Titre de section : capitales larges, numéro d'ordre facultatif à droite */
export function Rubrique({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h2 className="large text-[19px] font-extrabold uppercase tracking-[0.02em] text-marine-nuit">{titre}</h2>
      {children}
    </div>
  );
}

/* Feuille blanche bordée, support de tous les contenus */
export function Feuille({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[6px] border border-marine-filet bg-white ${className}`}>{children}</div>;
}
