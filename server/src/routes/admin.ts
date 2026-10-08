import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/db';
import { auth, uid, wrap } from '../lib/http';
import { duree, heure, instantLocal, jourLocal } from '../lib/temps';
import { ipClient, ecrireZone, lireZone } from '../lib/parametres';
import { journaliser, notifier } from '../lib/traces';
import { relevePdf } from '../lib/pdf';

export const adminRoutes = Router();
const admin = auth(['ADMIN']);

const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

/* ---------- Pointages (EF-16 à EF-19) ---------- */
export type Filtres = { du?: string; au?: string; service?: string; userId?: string };

export async function chercherPointages(q: Filtres) {
  const where: Prisma.PointageWhereInput = {
    jour: {
      gte: new Date(JOUR.test(q.du ?? '') ? q.du! : '1970-01-01'),
      lte: new Date(JOUR.test(q.au ?? '') ? q.au! : '2999-12-31'),
    },
  };
  if (q.userId) where.userId = Number(q.userId);
  if (q.service) where.user = { service: q.service };
  const rows = await prisma.pointage.findMany({
    where,
    include: { user: { select: { matricule: true, nom: true, service: true } } },
    orderBy: [{ jour: 'desc' }, { arrivee: 'asc' }],
    take: 5000,
  });
  return rows.map((r) => ({ ...r, duree: duree(r.arrivee, r.depart) }));
}

adminRoutes.get('/admin/pointages', admin, wrap(async (req, res) => res.json(await chercherPointages(req.query as Filtres))));

adminRoutes.get('/admin/pointages/pdf', admin, wrap(async (req, res) => {
  const q = req.query as Filtres;
  const rows = await chercherPointages(q);
  const agent = q.userId ? await prisma.user.findUnique({ where: { id: Number(q.userId) } }) : null;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="releve-presences.pdf"');
  relevePdf(res, rows, { du: q.du, au: q.au, service: q.service, agent: agent ? `${agent.nom} (${agent.matricule})` : undefined });
}));

// Le jour courant, tous agents actifs, avec ou sans pointage
adminRoutes.get('/admin/aujourdhui', admin, wrap(async (_req, res) => {
  const jour = jourLocal();
  const [agents, pointages] = await Promise.all([
    prisma.user.count({ where: { actif: true, role: 'EMPLOYEE' } }),
    prisma.pointage.findMany({ where: { jour }, select: { depart: true } }),
  ]);
  res.json({
    jour: jour.toISOString().slice(0, 10),
    agents,
    arrives: pointages.length,
    partis: pointages.filter((p) => p.depart).length,
  });
}));

/* ---------- Régularisation (EF-11) ---------- */
adminRoutes.post('/admin/pointages/regulariser', admin, wrap(async (req, res) => {
  const { userId, jour, arrivee, depart, motif } = req.body;
  if (!JOUR.test(String(jour ?? ''))) return res.status(400).json({ error: 'Date invalide.' });
  if (!HEURE.test(String(arrivee ?? ''))) return res.status(400).json({ error: "Heure d'arrivée invalide (HH:MM)." });
  if (depart && !HEURE.test(String(depart))) return res.status(400).json({ error: 'Heure de départ invalide (HH:MM).' });
  if (String(motif ?? '').trim().length < 5) return res.status(400).json({ error: 'Le motif est obligatoire (5 caractères minimum).' });
  if (jour > jourLocal().toISOString().slice(0, 10)) return res.status(400).json({ error: 'Impossible de régulariser un jour futur.' });

  const u = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!u) return res.status(404).json({ error: 'Agent introuvable.' });
  const a = instantLocal(jour, arrivee);
  const d = depart ? instantLocal(jour, depart) : null;
  if (d && d <= a) return res.status(400).json({ error: "Le départ doit être postérieur à l'arrivée." });

  const data = { arrivee: a, depart: d, regularise: true, motif: String(motif).trim(), regularisePar: uid(req) };
  const p = await prisma.pointage.upsert({
    where: { userId_jour: { userId: u.id, jour: new Date(jour) } },
    update: data,
    create: { ...data, userId: u.id, jour: new Date(jour) },
  });
  const resume = `${u.nom} (${u.matricule}), ${jour} : arrivée ${heure(a)}, départ ${d ? heure(d) : '-'}. Motif : ${data.motif}`;
  await journaliser(uid(req), 'REGULARISATION', resume);
  await notifier(u.id, 'REGULARISATION', `Pointage régularisé pour ${u.nom} (${jour})`);
  res.json(p);
}));

/* ---------- Notifications (EF-21) ---------- */
adminRoutes.get('/admin/notifications', admin, wrap(async (_req, res) =>
  res.json(await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 80 }))));

adminRoutes.get('/admin/journal', admin, wrap(async (_req, res) =>
  res.json(await prisma.journal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { auteur: { select: { nom: true, matricule: true } } },
  }))));

/* ---------- Comptes (EF-02, EF-04) ---------- */
const ROLES: Role[] = ['EMPLOYEE', 'ADMIN', 'TECH'];
const roleValide = (r: unknown): Role => (ROLES.includes(r as Role) ? (r as Role) : 'EMPLOYEE');

adminRoutes.get('/admin/users', admin, wrap(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, matricule: true, nom: true, service: true, role: true, actif: true, doitChangerMdp: true, createdAt: true,
      _count: { select: { credentials: true } },
    },
    orderBy: { nom: 'asc' },
  });
  res.json(users.map(({ _count, ...u }) => ({ ...u, biometrie: _count.credentials > 0 })));
}));

adminRoutes.get('/admin/services', admin, wrap(async (_req, res) => {
  const rows = await prisma.user.findMany({ where: { service: { not: null } }, distinct: ['service'], select: { service: true } });
  res.json(rows.map((r) => r.service).sort());
}));

adminRoutes.post('/admin/users', admin, wrap(async (req, res) => {
  const matricule = String(req.body.matricule ?? '').trim();
  const nom = String(req.body.nom ?? '').trim();
  const password = String(req.body.password ?? '');
  if (!matricule || !nom) return res.status(400).json({ error: 'Le matricule et le nom sont obligatoires.' });
  if (password.length < 8) return res.status(400).json({ error: 'Le mot de passe initial doit contenir au moins 8 caractères.' });
  if (await prisma.user.findUnique({ where: { matricule } }))
    return res.status(409).json({ error: `Le matricule ${matricule} existe déjà.` });
  const u = await prisma.user.create({
    data: {
      matricule, nom,
      service: String(req.body.service ?? '').trim() || null,
      role: roleValide(req.body.role),
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  await journaliser(uid(req), 'CREATION_COMPTE', `${nom} (${matricule}), profil ${u.role}`);
  res.status(201).json({ id: u.id });
}));

adminRoutes.patch('/admin/users/:id', admin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === uid(req) && (req.body.actif === false || (req.body.role && req.body.role !== 'ADMIN')))
    return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte ni retirer vos droits.' });
  const data: Prisma.UserUpdateInput = {};
  if (typeof req.body.nom === 'string' && req.body.nom.trim()) data.nom = req.body.nom.trim();
  if (typeof req.body.service === 'string') data.service = req.body.service.trim() || null;
  if (req.body.role) data.role = roleValide(req.body.role);
  if (typeof req.body.actif === 'boolean') data.actif = req.body.actif;
  const u = await prisma.user.update({ where: { id }, data });
  await journaliser(uid(req), 'MODIFICATION_COMPTE', `${u.nom} (${u.matricule}) : ${JSON.stringify(req.body)}`);
  res.json({ ok: true });
}));

adminRoutes.post('/admin/users/:id/password', admin, wrap(async (req, res) => {
  const password = String(req.body.password ?? '');
  if (password.length < 8) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  const u = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { passwordHash: await bcrypt.hash(password, 10), doitChangerMdp: true },
  });
  await journaliser(uid(req), 'REINIT_MOT_DE_PASSE', `${u.nom} (${u.matricule})`);
  res.json({ ok: true });
}));

adminRoutes.delete('/admin/users/:id/credentials', admin, wrap(async (req, res) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: Number(req.params.id) } });
  await prisma.credential.deleteMany({ where: { userId: u.id } });
  await journaliser(uid(req), 'REINIT_EMPREINTE', `${u.nom} (${u.matricule})`);
  res.json({ ok: true });
}));

/* ---------- Zone de pointage (EF-15) ---------- */
const tech = auth(['TECH', 'ADMIN']);

adminRoutes.get('/admin/parametres', tech, wrap(async (req, res) =>
  res.json({ ...(await lireZone()), monIp: ipClient(req.ip) })));

adminRoutes.put('/admin/parametres', tech, wrap(async (req, res) => {
  const ips = String(req.body.ALLOWED_IPS ?? '').split(/[\s,]+/).filter(Boolean);
  const lat = Number(req.body.ZONE_LAT);
  const lng = Number(req.body.ZONE_LNG);
  const rayon = Number(req.body.ZONE_RADIUS);
  if (!ips.length) return res.status(400).json({ error: 'Indiquez au moins une adresse IP autorisée.' });
  if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180)) return res.status(400).json({ error: 'Coordonnées GPS invalides.' });
  if (!(rayon >= 20 && rayon <= 5000)) return res.status(400).json({ error: 'Le rayon doit être compris entre 20 et 5 000 mètres.' });
  const z = { ALLOWED_IPS: ips.join(','), ZONE_LAT: String(lat), ZONE_LNG: String(lng), ZONE_RADIUS: String(Math.round(rayon)) };
  await ecrireZone(z);
  await journaliser(uid(req), 'PARAMETRES_ZONE', `IP ${z.ALLOWED_IPS} ; centre ${lat}, ${lng} ; rayon ${z.ZONE_RADIUS} m`);
  res.json(z);
}));
