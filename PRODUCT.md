# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Agents** du Port Autonome de Douala : pointent leur arrivée et leur départ sur leur propre téléphone, debout, souvent d'une main, à l'entrée du site, sur le Wi-Fi de la Direction.
- **Administrateurs** (RH, Direction) : sur ordinateur au bureau ; créent les comptes, consultent les pointages, filtrent, régularisent, exportent et impriment les relevés, suivent les notifications.
- **Administrateur technique** (DSI ou prestataire) : règle l'adresse IP du réseau et la zone GPS de pointage.

## Product Purpose

Rendre le pointage strictement personnel (empreinte vérifiée par le téléphone de l'agent, WebAuthn) et lié à la présence réelle sur le site (IP du Wi-Fi de la Direction + zone GPS), enregistrer automatiquement arrivée et départ, et donner à la hiérarchie un tableau des présences fiable, exportable en PDF. Succès : aucun pointage accepté hors réseau ou hors zone, arrivée/départ corrects pour tous les agents, relevé PDF identique au tableau.

## Positioning

Le pointage exige trois preuves au même instant : l'empreinte de l'agent sur son téléphone, le réseau de la Direction et la position. Un registre ou une badgeuse ne prouve pas les trois.

## Operating Context

- Cahier des charges v1.0 du 7 octobre 2026 (`Cahier_des_charges_Pointage_PAD (1).docx`) : exigences EF-01 à EF-26, lot 1 en cours.
- Pic de pointages le matin ; dimensionné pour 500 agents.
- Pointage en deux gestes : appuyer sur le bouton, poser le doigt.
- Relevés imprimés et archivés par les RH.

## Capabilities and Constraints

- Stack imposée : React + TypeScript + Tailwind + Vite ; Node/Express + Prisma + MySQL 8 ; SimpleWebAuthn ; PDFKit ; déploiement Ubuntu + Nginx + PM2 + Let's Encrypt.
- HTTPS obligatoire hors localhost pour WebAuthn.
- Un navigateur ne peut pas lire le nom du Wi-Fi : contrôle par IP publique fixe.
- La position GPS n'est jamais conservée ; l'empreinte ne quitte jamais le téléphone.
- Compatibilité : Android 9+, iOS 15+, Chrome/Edge/Firefox récents.
- Lot 2 (absences, Excel, statistiques, appli native) hors périmètre actuel.

## Brand Commitments

- Nom : Port Autonome de Douala / Port Authority of Douala. Logo officiel (voile et vagues) obligatoire.
- Charte imposée (Annexe B) : blanc dominant (#FFFFFF) ; bleu #0A4DA2 pour en-tête, actions principales, titres ; vert citron #C5E91B pour validations, heure d'arrivée, filets ; jaune #FFC93C pour heure de départ et attention.
- Ton institutionnel et sobre ; interface entièrement en français.

## Evidence on Hand

- Logo PAD (PNG fourni par l'utilisateur).
- Aucune liste réelle d'agents ni de services : ne pas en inventer dans l'interface livrée.

## Product Principles

1. La preuve avant tout : chaque écran dit clairement ce qui a été vérifié et pourquoi un pointage est refusé.
2. Deux gestes pour l'agent ; rien ne doit ralentir le pointage du matin.
3. L'administrateur trouve, corrige et imprime sans aide ; toute correction laisse une trace.
4. Sobriété institutionnelle : l'établissement public parle, pas une application grand public.

## Accessibility & Inclusion

Utilisable d'une main sur téléphone ; contrastes lisibles en extérieur ; messages d'erreur en clair, en français.
