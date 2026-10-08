import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { formatDuree, heure } from './temps';

type Ligne = {
  jour: Date;
  arrivee: Date;
  depart: Date | null;
  duree: number | null;
  regularise: boolean;
  user: { matricule: string; nom: string; service: string | null };
};
type Filtres = { du?: string; au?: string; service?: string; agent?: string };

const BLEU = '#0A4DA2';
const CITRON = '#C5E91B';
const JAUNE = '#FFC93C';
const LOGO = path.join(__dirname, '..', '..', 'assets', 'logo-pad.png');
const dateFr = (s?: string) => (s ? new Date(s).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : null);

// Relevé des présences imprimable (EF-19), mêmes données que le tableau
export function relevePdf(out: NodeJS.WritableStream, rows: Ligne[], f: Filtres) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: 'Relevé des présences', Author: 'Port Autonome de Douala' } });
  doc.pipe(out);

  if (fs.existsSync(LOGO)) doc.image(LOGO, 40, 34, { width: 58 });
  doc.fillColor(BLEU).font('Helvetica-Bold').fontSize(15).text('PORT AUTONOME DE DOUALA', 110, 42);
  doc.fillColor('#333').font('Helvetica').fontSize(9).text('Port Authority of Douala', 110, 60);
  doc.fillColor(BLEU).font('Helvetica-Bold').fontSize(12).text('Relevé des présences', 110, 76);

  // Filet aux couleurs du logo
  doc.rect(40, 104, 400, 2.5).fill(BLEU);
  doc.rect(440, 104, 75, 2.5).fill(CITRON);
  doc.rect(515, 104, 40, 2.5).fill(JAUNE);

  const periode = `Période : du ${dateFr(f.du) ?? 'début'} au ${dateFr(f.au) ?? "jour de l'édition"}`;
  const criteres = [periode, f.service && `Service : ${f.service}`, f.agent && `Agent : ${f.agent}`].filter(Boolean).join('   ·   ');
  doc.fillColor('#222').font('Helvetica').fontSize(9).text(criteres, 40, 116, { width: 515 });

  const x = [40, 92, 210, 300, 360, 410, 460, 515];
  const titres = ['Matricule', 'Nom', 'Service', 'Date', 'Arrivée', 'Départ', 'Durée', ''];
  const ligne = (y: number, t: string[], gras = false, couleur = '#111') => {
    doc.fillColor(couleur).font(gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
    t.forEach((s, i) => doc.text(s, x[i] + 3, y, { width: (x[i + 1] ?? 555) - x[i] - 6, lineBreak: false, ellipsis: true }));
  };
  const entete = (y: number) => {
    doc.rect(40, y - 5, 515, 18).fill(BLEU);
    ligne(y, titres, true, '#fff');
    return y + 18;
  };

  let y = entete(146);
  rows.forEach((r, i) => {
    if (y > 770) { doc.addPage(); y = entete(50); }
    if (i % 2) doc.rect(40, y - 4, 515, 16).fill('#F2F5FA');
    ligne(y, [
      r.user.matricule, r.user.nom, r.user.service ?? '-',
      r.jour.toLocaleDateString('fr-FR', { timeZone: 'UTC' }),
      heure(r.arrivee), r.depart ? heure(r.depart) : '-', formatDuree(r.duree),
      r.regularise ? 'Rég.' : '',
    ]);
    y += 16;
  });
  if (!rows.length) doc.fillColor('#555').font('Helvetica-Oblique').fontSize(9).text('Aucun pointage sur cette période.', 43, y + 4);

  const total = rows.length;
  const regul = rows.filter((r) => r.regularise).length;
  const edition = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala', dateStyle: 'long', timeStyle: 'short' });
  const pages = doc.bufferedPageRange();
  for (let p = 0; p < pages.count; p++) {
    doc.switchToPage(p);
    doc.rect(40, 800, 515, 0.5).fill('#9AA9C2');
    doc.fillColor('#555').font('Helvetica').fontSize(7.5)
      .text(`${total} pointage(s), dont ${regul} régularisé(s) (Rég.)   ·   Édité le ${edition}`, 40, 806, { width: 420, lineBreak: false })
      .text(`Page ${p + 1} / ${pages.count}`, 455, 806, { width: 100, align: 'right', lineBreak: false });
  }
  doc.end();
}
