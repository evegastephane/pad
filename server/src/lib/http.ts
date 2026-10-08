import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from './config';
import { prisma } from './db';

export type Auth = { id: number; role: Role };
type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res, next).catch(next);
};

// Vérifie le jeton, puis que le compte existe toujours et n'est pas désactivé
export const auth = (roles?: Role[]) =>
  wrap(async (req, res, next) => {
    let payload: Auth;
    try {
      payload = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), config.jwtSecret) as Auth;
    } catch {
      return res.status(401).json({ error: 'Session expirée, reconnectez-vous.' });
    }
    const u = await prisma.user.findUnique({ where: { id: payload.id }, select: { actif: true, role: true } });
    if (!u || !u.actif) return res.status(401).json({ error: 'Compte désactivé. Contactez les ressources humaines.' });
    if (roles && !roles.includes(u.role)) return res.status(403).json({ error: 'Accès refusé.' });
    (req as any).auth = { id: payload.id, role: u.role };
    next();
  });

export const uid = (req: Request) => ((req as any).auth as Auth).id;

export const signer = (u: { id: number; role: Role }) =>
  jwt.sign({ id: u.id, role: u.role }, config.jwtSecret, { expiresIn: '12h' });
