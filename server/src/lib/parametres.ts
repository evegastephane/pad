import { Request } from 'express';
import { prisma } from './db';
import { config } from './config';

export type Zone = { ALLOWED_IPS: string; ZONE_LAT: string; ZONE_LNG: string; ZONE_RADIUS: string };
const CLES = Object.keys(config.zoneDefaut) as (keyof Zone)[];

let cache: Zone | null = null;

export async function lireZone(): Promise<Zone> {
  if (cache) return cache;
  const rows = await prisma.parametre.findMany({ where: { cle: { in: CLES } } });
  const zone = { ...config.zoneDefaut };
  for (const r of rows) zone[r.cle as keyof Zone] = r.valeur;
  cache = zone;
  return zone;
}

export async function ecrireZone(z: Zone) {
  await prisma.$transaction(
    CLES.map((cle) =>
      prisma.parametre.upsert({ where: { cle }, update: { valeur: z[cle] }, create: { cle, valeur: z[cle] } }),
    ),
  );
  cache = null;
}

const distance = (a1: number, o1: number, a2: number, o2: number) => {
  const r = Math.PI / 180;
  const h =
    Math.sin(((a2 - a1) * r) / 2) ** 2 +
    Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(((o2 - o1) * r) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

// Adresse IP du client : en-tête de la plateforme (Vercel) ou adresse vue par Express (Nginx, accès direct)
export const ipClient = (req: Request) => {
  const brute = config.ipHeader ? String(req.headers[config.ipHeader] ?? '').split(',')[0].trim() : req.ip;
  return (brute || '').replace('::ffff:', '');
};

// Retourne un message de refus, ou null si la personne est bien dans la zone.
// La position n'est jamais enregistrée (cahier des charges, §7).
export async function verifierZone(ip: string, lat?: unknown, lng?: unknown) {
  const z = await lireZone();
  const ips = z.ALLOWED_IPS.split(',').map((s) => s.trim()).filter(Boolean);
  if (!ips.includes(ip)) return 'Connectez-vous au Wi-Fi de la Direction pour pointer.';
  if (typeof lat !== 'number' || typeof lng !== 'number') return 'Position GPS requise.';
  if (distance(lat, lng, Number(z.ZONE_LAT), Number(z.ZONE_LNG)) > Number(z.ZONE_RADIUS))
    return 'Vous êtes en dehors de la zone de pointage.';
  return null;
}
