export type Role = 'EMPLOYEE' | 'ADMIN' | 'TECH';

export type Me = {
  id: number;
  matricule: string;
  nom: string;
  service: string | null;
  role: Role;
  doitChangerMdp: boolean;
  biometrie: boolean;
  aujourdhui: { arrivee: string; depart: string | null } | null;
};

export type Pointage = {
  id: number;
  userId: number;
  jour: string;
  arrivee: string;
  depart: string | null;
  duree: number | null;
  regularise: boolean;
  motif: string | null;
  user: { matricule: string; nom: string; service: string | null };
};

export type Agent = {
  id: number;
  matricule: string;
  nom: string;
  service: string | null;
  role: Role;
  actif: boolean;
  doitChangerMdp: boolean;
  biometrie: boolean;
  createdAt: string;
};

export type NotifType = 'ARRIVEE' | 'DEPART' | 'REFUS' | 'ENROLEMENT' | 'REGULARISATION';
export type Notif = { id: number; type: NotifType; message: string; createdAt: string };
export type EntreeJournal = { id: number; action: string; detail: string; createdAt: string; auteur: { nom: string; matricule: string } };
export type Zone = { ALLOWED_IPS: string; ZONE_LAT: string; ZONE_LNG: string; ZONE_RADIUS: string; monIp?: string };

const CLE = 'pad.jeton';
export const getToken = () => localStorage.getItem(CLE);
export const setToken = (t: string | null) => (t ? localStorage.setItem(CLE, t) : localStorage.removeItem(CLE));

const entetes = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// Signale à l'application qu'il faut revenir à l'écran de connexion
export const SESSION_EXPIREE = 'pad:session-expiree';

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...entetes() },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('Serveur injoignable. Vérifiez votre connexion au réseau.');
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && getToken() && path !== '/auth/login') {
    setToken(null);
    window.dispatchEvent(new Event(SESSION_EXPIREE));
  }
  if (!r.ok) throw new Error(data.error ?? `Erreur du serveur (${r.status}).`);
  return data as T;
}

// Ouvre le relevé PDF dans un nouvel onglet, prêt à imprimer
export async function ouvrirPdf(path: string) {
  const fenetre = window.open('', '_blank');
  const r = await fetch(`/api${path}`, { headers: entetes() });
  if (!r.ok) {
    fenetre?.close();
    throw new Error("Le relevé n'a pas pu être généré.");
  }
  const url = URL.createObjectURL(await r.blob());
  if (fenetre) fenetre.location.href = url;
  else window.location.href = url;
}
