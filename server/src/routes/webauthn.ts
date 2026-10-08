import { Router } from 'express';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { prisma } from '../lib/db';
import { config } from '../lib/config';
import { auth, uid, wrap } from '../lib/http';
import { notifier } from '../lib/traces';

export const webauthnRoutes = Router();

const DEJA =
  "Une empreinte est déjà enregistrée sur votre compte. En cas de changement de téléphone, demandez sa réinitialisation à l'administrateur.";

// Enrôlement unique (EF-05) : une seule empreinte par agent, réinitialisable par l'administrateur (EF-04)
webauthnRoutes.post('/webauthn/register/options', auth(), wrap(async (req, res) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) }, include: { credentials: true } });
  if (u.credentials.length) return res.status(409).json({ error: DEJA });
  const options = await generateRegistrationOptions({
    rpName: 'Port Autonome de Douala',
    rpID: config.rpId,
    userName: u.matricule,
    userDisplayName: u.nom,
    userID: new TextEncoder().encode(String(u.id)),
    attestationType: 'none',
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
  });
  await prisma.user.update({ where: { id: u.id }, data: { challenge: options.challenge } });
  res.json(options);
}));

webauthnRoutes.post('/webauthn/register/verify', auth(), wrap(async (req, res) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) }, include: { credentials: true } });
  if (u.credentials.length) return res.status(409).json({ error: DEJA });
  const v = await verifyRegistrationResponse({
    response: req.body,
    expectedChallenge: u.challenge ?? '',
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    requireUserVerification: true,
  }).catch(() => null);
  if (!v?.verified || !v.registrationInfo)
    return res.status(400).json({ error: "L'empreinte n'a pas pu être validée. Réessayez." });
  const { credential } = v.registrationInfo;
  await prisma.$transaction([
    prisma.credential.create({
      data: { id: credential.id, publicKey: Buffer.from(credential.publicKey), counter: credential.counter, userId: u.id },
    }),
    prisma.user.update({ where: { id: u.id }, data: { challenge: null } }),
  ]);
  await notifier(u.id, 'ENROLEMENT', `${u.nom} (${u.matricule}) a enregistré son empreinte`);
  res.json({ ok: true });
}));
