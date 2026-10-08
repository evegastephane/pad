import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { prisma } from '../lib/db';
import { auth, signer, uid, wrap } from '../lib/http';
import { jourLocal } from '../lib/temps';

export const authRoutes = Router();

// 10 essais par quart d'heure, par adresse et par matricule
const limite = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${String(req.body?.matricule ?? '').toUpperCase()}`,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

authRoutes.post('/auth/login', limite, wrap(async (req, res) => {
  const matricule = String(req.body.matricule ?? '').trim();
  const u = await prisma.user.findUnique({ where: { matricule } });
  if (!u || !(await bcrypt.compare(String(req.body.password ?? ''), u.passwordHash)))
    return res.status(401).json({ error: 'Matricule ou mot de passe incorrect.' });
  if (!u.actif) return res.status(403).json({ error: 'Compte désactivé. Contactez les ressources humaines.' });
  res.json({ token: signer(u) });
}));

authRoutes.get('/me', auth(), wrap(async (req, res) => {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: uid(req) },
    include: { credentials: { select: { id: true } }, pointages: { where: { jour: jourLocal() } } },
  });
  res.json({
    id: u.id,
    matricule: u.matricule,
    nom: u.nom,
    service: u.service,
    role: u.role,
    doitChangerMdp: u.doitChangerMdp,
    biometrie: u.credentials.length > 0,
    aujourdhui: u.pointages[0] ?? null,
  });
}));

authRoutes.post('/me/password', auth(), wrap(async (req, res) => {
  const { actuel, nouveau } = req.body;
  const u = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) } });
  if (!(await bcrypt.compare(String(actuel ?? ''), u.passwordHash)))
    return res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
  if (String(nouveau ?? '').length < 8)
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
  if (actuel === nouveau)
    return res.status(400).json({ error: "Choisissez un mot de passe différent de l'actuel." });
  await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash: await bcrypt.hash(String(nouveau), 10), doitChangerMdp: false },
  });
  res.json({ ok: true });
}));
