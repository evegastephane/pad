import path from 'path';
import fs from 'fs';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './lib/config';
import { authRoutes } from './routes/auth';
import { webauthnRoutes } from './routes/webauthn';
import { pointageRoutes } from './routes/pointage';
import { adminRoutes } from './routes/admin';

// Application Express, partagée par le serveur classique (index.ts) et la fonction Vercel (api/index.ts)
export const app = express();
app.set('trust proxy', config.trustProxy);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.origin }));
app.use(express.json({ limit: '50kb' }));

app.use('/api', authRoutes, webauthnRoutes, pointageRoutes, adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ressource introuvable.' }));

// En production sur serveur, l'API sert aussi l'interface compilée (même origine, requis par WebAuthn)
if (config.clientDist && fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

app.use((e: Error & { code?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (e.code === 'P2025') return res.status(404).json({ error: 'Élément introuvable.' });
  console.error(e);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});
