# Design · Registre de présence PAD

Monde visuel : **le titre sécurisé**, l'impression fiduciaire des documents officiels (passeport, carte d'identité,
billets FCFA). Chaque pointage délivre à l'agent un titre de présence du jour, avec sa rosette guillochée personnelle,
son sceau et sa zone lisible par machine. Ton institutionnel mais affirmé : grands aplats bleus, identité du Port
bien visible. Charte imposée par le cahier des charges (annexe B) ; logo officiel `client/public/logo-pad.png`.

Remplace le monde « registre papier » (jugé trop austère, octobre 2026).

## Couleurs (tokens Tailwind, `client/tailwind.config.js`)

| Token | Valeur | Rôle |
|---|---|---|
| `marine` | #0A4DA2 | Aplats taille-douce : bandeaux, bouton principal, motifs guillochés |
| `marine-fonce` / `marine-nuit` | #073574 / #0B1F3A | Survol / bordereau du jour, titres, chiffres |
| `marine-clair` / `marine-filet` | #E8EEF8 / #C9D6EA | Bandeaux de jour, zone lisible par machine / filets, rosette vierge |
| `ciel` | #4FA9DE | Bande claire du logo, relais de l'encrage iris |
| `citron` / `citron-encre` | #C5E91B / #3F4B05 | Validation, arrivée, en poste, onglet actif |
| `soleil` / `soleil-encre` | #FFC93C / #5C4300 | Départ, parti, « Régularisé » |
| `refus` | #B42318 | Refus, actions irréversibles, numéro de série du titre |
| `encre` / `-douce` / `-pale` | #14223A / #4A5873 / #6B7891 | Texte courant / secondaire / indications |
| `papier` / `bureau` | #FBFCFE / #EDF1F7 | Fond des formulaires / plateau sur lequel les titres sont posés |

**Encrage iris** (`.iris`) : dégradé continu bleu → ciel → citron → jaune, sous chaque bandeau et en tête du titre,
comme l'impression iris d'un billet. Jamais sur du texte.
Citron et jaune portent toujours leur encre foncée, jamais du blanc.

## Typographie

- **Archivo Variable** avec axe de largeur (`@fontsource-variable/archivo/wdth.css`) : seule famille de texte.
  - `.large` (`font-stretch: 125%`) : capitales larges des titres officiels (bandeaux, rubriques, « Registre de présence »).
  - Texte courant à largeur normale ; chiffres tabulaires partout.
- **Azeret Mono Variable** : uniquement pour les données lues comme des données (numéro de série, matricules du
  registre, heures de la main courante, zone lisible par machine).
- `.rubrique` : libellés 10,5 px, capitales, interlettrage 0,14 em, légèrement élargis.
- Heures du titre : 40 px extra-gras, interlettrage -0,02 em ; c'est le seul gros caractère du titre.

## Motifs (`client/src/ui/fiduciaire.tsx`) : tout est calculé en SVG, aucune image

- **Rosette** : trois anneaux de courbes polaires ondulées, répétées en copies tournées (moiré du guilloché).
  Paramètres tirés du **matricule** : chaque agent a un motif unique.
  États : `vierge` (filets pâles), `arrivee` (anneaux intérieurs bleus), `complete` (anneau extérieur à l'encre iris).
  `surAplat` : version filets blancs pour les fonds bleus (connexion).
- **Ondes** : sinusoïdes croisées, filets blancs à 9-13 % d'opacité, fond de tous les aplats bleus.
- **MicroTexte** : « PORT AUTONOME DE DOUALA » répété en 5,5 px, décoratif (`aria-hidden`).
- **Sceau** : cachet circulaire, texte sur arc ; marine « VÉRIFIÉ » à l'arrivée, citron « JOURNÉE CLOSE » au départ.

## Composants (`client/src/ui/kit.tsx`)

- **Bandeau** : aplat marine + ondes + bande iris. En-tête de toutes les surfaces.
- **Embleme** : le logo sur une pastille blanche (le logo bleu ne se pose jamais directement sur le bleu).
- **Titre de présence** (écran agent) : feuille blanche rayon 8 px, ombre `shadow-titre`, posée sur le bandeau ;
  iris, micro-texte, titulaire et n° de série, rosette, date, talons Arrivée / Départ séparés par une perforation
  (pointillés + encoches), zone lisible par machine.
- **Feuille** : support blanc rayon 6 px, filet `marine-filet`, sans ombre.
- **Bouton** : rayon 4 px ; principal (marine plein), secondaire (contour), discret, danger (contour rouge, plein au survol).
- **Marqueur** : étiquette pleine, capitales 10 px.
- **Dialogues** : en-tête en aplat marine avec ondes + iris.
- Une seule ombre portée, réservée aux objets posés (titre, dialogues, bouton d'action agent).

## Registre (administration)

- **Bordereau du jour** : aplat `marine-nuit` ; une case par agent actif (citron en poste, jaune parti, vide non pointé).
- **Barre de présence** : longueur exacte de la durée sur l'échelle 6 h – 20 h ; repère citron à l'arrivée, jaune au départ ;
  barre atténuée tant que l'agent est en poste.
- Au survol, la ligne se détache et le reste du jour s'estompe (opacité 55 %).
- Actions irréversibles (effacer l'empreinte, désactiver) séparées par un filet vertical, en contour rouge.

## Mouvement

Un seul moment signature, à chaque pointage réussi : les anneaux de la rosette **se tracent** (`.trace`, 1,4 s,
départs décalés de 18 ms par courbe), puis le **sceau se pose** (`animate-sceau`, 520 ms, retard 900 ms) et l'heure
**s'imprime** (`animate-impression`). Courbe `cubic-bezier(0.16, 1, 0.3, 1)`. Tout est réduit à 1 ms si l'utilisateur
demande moins d'animations.

## À ne pas faire

Cartes KPI, dégradés hors bande iris, texte en dégradé, coins très arrondis, emoji en guise d'icônes
(icônes : `lucide-react`), étiquettes au-dessus des titres, logo directement sur un aplat bleu,
guilloché derrière du texte courant ou des tableaux.
