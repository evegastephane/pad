import { Router } from 'express';
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { prisma } from '../lib/db';
import { config } from '../lib/config';
import { auth, uid, wrap } from '../lib/http';
import { heure, jourLocal } from '../lib/temps';
import { ipClient, verifierZone } from '../lib/parametres';
import { notifier } from '../lib/traces';

export const pointageRoutes = Router();

pointageRoutes.post('/pointage/options', auth(), wrap(async (req, res) => {
  const creds = await prisma.credential.findMany({ where: { userId: uid(req) } });
  if (!creds.length) return res.status(400).json({ error: "Enregistrez d'abord votre empreinte." });
  const options = await generateAuthenticationOptions({
    rpID: config.rpId,
    userVerification: 'required',
    allowCredentials: creds.map((c) => ({ id: c.id })),
  });
  await prisma.user.update({ where: { id: uid(req) }, data: { challenge: options.challenge } });
  res.json(options);
}));

pointageRoutes.post('/pointage', auth(), wrap(async (req, res) => {
  const { assertion, lat, lng } = req.body;
  const u = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) }, include: { credentials: true } });

  const refus = await verifierZone(ipClient(req), lat, lng);
  if (refus) {
    await notifier(u.id, 'REFUS', `${u.nom} : pointage refusé (${refus})`);
    return res.status(403).json({ error: refus });
  }

  const cred = u.credentials.find((c) => c.id === assertion?.id);
  if (!cred) return res.status(400).json({ error: 'Empreinte inconnue sur ce compte.' });
  const v = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge: u.challenge ?? '',
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    requireUserVerification: true,
    credential: { id: cred.id, publicKey: new Uint8Array(cred.publicKey), counter: cred.counter },
  }).catch(() => null);
  if (!v?.verified) {
    await notifier(u.id, 'REFUS', `${u.nom} : pointage refusé (empreinte non reconnue)`);
    return res.status(401).json({ error: 'Empreinte non reconnue.' });
  }
  await prisma.credential.update({ where: { id: cred.id }, data: { counter: v.authenticationInfo.newCounter } });
  await prisma.user.update({ where: { id: u.id }, data: { challenge: null } });

  const jour = jourLocal();
  const now = new Date();
  const existant = await prisma.pointage.findUnique({ where: { userId_jour: { userId: u.id, jour } } });
  if (!existant) {
    const p = await prisma.pointage.create({ data: { userId: u.id, jour, arrivee: now } });
    await notifier(u.id, 'ARRIVEE', `${u.nom} est arrivé(e) à ${heure(now)}`);
    return res.json({ type: 'ARRIVEE', pointage: p });
  }
  if (existant.depart)
    return res.status(409).json({ error: "Votre arrivée et votre départ sont déjà enregistrés aujourd'hui." });
  const p = await prisma.pointage.update({ where: { id: existant.id }, data: { depart: now } });
  await notifier(u.id, 'DEPART', `${u.nom} est parti(e) à ${heure(now)}`);
  res.json({ type: 'DEPART', pointage: p });
}));
