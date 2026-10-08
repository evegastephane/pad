---
version: 1
slug: "client-src"
primary_target: "client/src"
related_targets: []
---

# Surface : application de pointage PAD (client/src, toutes routes)

Mode : Operate. Agents (téléphone, une main, à l'entrée, chaque jour) ; administrateurs RH (ordinateur) ; admin technique (zone).
Refonte demandée : la version « registre » jugée trop austère et administrative. Ton voulu : institutionnel mais affirmé, identité du Port bien visible. Charte du cahier (annexe B) et logo imposés.

## Direction contract

THESIS: Chaque pointage délivre un titre officiel infalsifiable, comme une pièce d'identité ou un billet FCFA. Refuse le formulaire papier (version précédente) et le tableau de bord SaaS à cartes.

OWN-WORLD: Impression fiduciaire. Grands aplats bleu taille-douce #0A4DA2 / nuit #0B1F3A ; guilloché au trait fin (rosettes, ondes, bordures) généré en SVG ; bande iris dégradée bleu → citron → jaune ; micro-texte répété (PORT AUTONOME DE DOUALA) ; numéro de série en chiffres espacés ; sceau rond. Le blanc reste le papier dominant ; le bleu prend des bandeaux entiers, pas des liserés.

STORY: L'agent voit son titre du jour, appuie, pose le doigt ; la rosette (unique, calculée depuis son matricule) se trace et se scelle, l'heure s'imprime. L'admin lit le registre comme un bordereau de valeurs : bandeau guilloché, barres de présence à l'échelle exacte de la journée, relevés numérotés.

FIRST VIEWPORT: Téléphone : bandeau bleu plein (logo, « Titre de présence », n° de série), bande iris ; rosette guillochée 220 px au centre avec l'état du jour ; deux talons Arrivée / Départ en chiffres 40 px ; bouton empreinte pleine largeur en bas. Admin : bandeau bleu guilloché pleine largeur avec la synthèse du jour en grands chiffres, puis registre.

FORM: Titre sécurisé (impression fiduciaire), candidat 7 de ma liste ordonnée, seed dcffe6d8. Raises : rosette issue du matricule (Ikeda) ; barre de durée exacte 6 h–20 h (Labanotation) ; actions irréversibles isolées en contour (console) ; l'heure seul gros caractère du titre (Saville) ; ligne choisie détachée, reste estompé (streaming). Interaction signature : la rosette se trace (stroke-dashoffset) puis le sceau se pose quand les trois contrôles passent.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
