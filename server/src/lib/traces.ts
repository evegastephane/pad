import { NotifType } from '@prisma/client';
import { prisma } from './db';

export const notifier = (userId: number, type: NotifType, message: string) =>
  prisma.notification.create({ data: { userId, type, message } });

export const journaliser = (auteurId: number, action: string, detail: string) =>
  prisma.journal.create({ data: { auteurId, action, detail } });
