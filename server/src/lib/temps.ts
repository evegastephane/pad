// Douala : UTC+1 toute l'année, sans changement d'heure
const DECALAGE = 3600_000;

export const jourLocal = (d = new Date()) => new Date(new Date(d.getTime() + DECALAGE).toISOString().slice(0, 10));

export const heure = (d: Date) =>
  d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' });

// Construit un instant à partir d'une date (AAAA-MM-JJ) et d'une heure (HH:MM) de Douala
export const instantLocal = (jour: string, hhmm: string) => new Date(`${jour}T${hhmm}:00+01:00`);

export const duree = (a: Date, d: Date | null) => {
  if (!d) return null;
  return Math.max(0, Math.round((d.getTime() - a.getTime()) / 60000));
};

export const formatDuree = (m: number | null) =>
  m === null ? '-' : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
