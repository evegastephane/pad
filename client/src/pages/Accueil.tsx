import { ReactNode } from 'react';
import { Iris, MicroTexte, Ondes, Rosette } from '../ui/fiduciaire';
import { Embleme } from '../ui/kit';

/* Gabarit des écrans d'accès : un panneau d'aplat officiel, puis la feuille du formulaire */
export default function Accueil({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-papier lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative overflow-hidden bg-marine text-white lg:min-h-dvh">
        <Ondes lignes={26} />
        <Rosette
          cle="PORT AUTONOME DE DOUALA"
          etat="complete"
          surAplat
          className="pointer-events-none absolute -right-24 -top-16 h-[300px] w-[300px] lg:opacity-60 lg:left-auto lg:-right-[18%] lg:top-1/2 lg:h-[min(86vh,700px)] lg:w-[min(86vh,700px)] lg:-translate-y-1/2"
        />
        <div className="relative flex h-full flex-col justify-between gap-10 px-5 pb-7 pt-[max(20px,env(safe-area-inset-top))] lg:px-12 lg:py-12">
          <div className="flex items-center gap-3">
            <Embleme taille={48} />
            <div className="leading-tight">
              <p className="large text-[13px] font-bold uppercase tracking-[0.08em]">Port Autonome de Douala</p>
              <p className="text-xs text-white/70">Port Authority of Douala</p>
            </div>
          </div>
          <div>
            <p className="rubrique !text-white/70">Titre de présence du personnel</p>
            <h1 className="large mt-2 text-[34px] font-black uppercase leading-[0.95] tracking-[-0.01em] lg:text-[64px]">
              Registre
              <br />
              de présence
            </h1>
            <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-white/80 lg:text-base">
              Chaque pointage est vérifié par votre empreinte, le Wi-Fi de la Direction et la zone du site.
            </p>
          </div>
          <MicroTexte className="hidden text-white/35 lg:block" />
        </div>
      </aside>
      <Iris className="lg:hidden" />
      <main className="flex flex-1 items-start justify-center px-5 py-8 lg:items-center lg:px-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
