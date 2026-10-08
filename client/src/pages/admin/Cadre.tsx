import { NavLink, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Me } from '../../api';
import { ROLES } from '../../format';
import { MicroTexte } from '../../ui/fiduciaire';
import { Bandeau, Embleme } from '../../ui/kit';

const ONGLETS = [
  { to: '/registre', titre: 'Registre', roles: ['ADMIN'] },
  { to: '/agents', titre: 'Agents', roles: ['ADMIN'] },
  { to: '/zone', titre: 'Zone de pointage', roles: ['ADMIN', 'TECH'] },
  { to: '/journal', titre: 'Journal', roles: ['ADMIN'] },
];

export default function Cadre({ me, onSortir }: { me: Me; onSortir: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bureau">
      <Bandeau>
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 pt-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Embleme taille={44} />
            <div className="leading-tight">
              <p className="large hidden text-[11px] font-semibold uppercase tracking-[0.1em] text-white/75 sm:block">Port Autonome de Douala</p>
              <p className="whitespace-nowrap text-base font-extrabold uppercase [font-stretch:115%] sm:text-lg sm:[font-stretch:125%]">Registre de présence</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold">{me.nom}</p>
              <p className="text-xs text-white/70">{ROLES[me.role]}</p>
            </div>
            <button onClick={onSortir} className="ml-2 flex h-10 items-center gap-2 rounded-[4px] px-3 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto mt-3 max-w-[1360px] overflow-x-auto px-4 sm:px-6" aria-label="Sections">
          <ul className="flex gap-1">
            {ONGLETS.filter((o) => o.roles.includes(me.role)).map((o) => (
              <li key={o.to}>
                <NavLink
                  to={o.to}
                  className={({ isActive }) =>
                    `large relative block whitespace-nowrap px-4 pb-3 pt-2 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
                      isActive
                        ? 'text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-citron'
                        : 'text-white/60 hover:text-white'
                    }`
                  }
                >
                  {o.titre}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </Bandeau>
      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <MicroTexte className="py-3 text-marine/30" />
    </div>
  );
}
