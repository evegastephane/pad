const TZ = 'Africa/Douala';

export const heure = (d?: string | null) =>
  d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : null;

export const duree = (m: number | null) => (m === null ? null : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`);

// Les jours sont stockés à minuit UTC : les lire en UTC
export const jourLong = (jour: string) =>
  new Date(jour).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const jourCourt = (jour: string) => new Date(jour).toLocaleDateString('fr-FR', { timeZone: 'UTC' });

export const horodatage = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: TZ });

// Date du jour à Douala, au format AAAA-MM-JJ
export const aujourdhui = (decalageJours = 0) => {
  const d = new Date(Date.now() + 3600_000 + decalageJours * 86400_000);
  return d.toISOString().slice(0, 10);
};

export const lundi = () => {
  const d = new Date(Date.now() + 3600_000);
  const j = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - j * 86400_000).toISOString().slice(0, 10);
};

export const debutMois = () => aujourdhui().slice(0, 8) + '01';

export const ROLES = { EMPLOYEE: 'Agent', ADMIN: 'Administrateur', TECH: 'Admin. technique' } as const;
