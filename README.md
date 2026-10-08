# Registre de présence · Port Autonome de Douala

Application de pointage du personnel (téléphone et ordinateur), conforme au lot 1 du cahier des charges v1.0 :
empreinte digitale (WebAuthn), pointage limité au Wi-Fi de la Direction et à une zone GPS, registre des
présences filtrable, régularisations tracées, relevé PDF et notifications en temps réel.

## Installation en local

Prérequis : Node.js 20+, Docker Desktop (pour MySQL).

```bash
# Base de données MySQL dédiée, sur le port 3307
docker volume create pointage-mysql-data
MYSQL_ROOT_PASSWORD=motdepasse docker compose up -d

# API
cd server
cp .env.example .env        # renseigner DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
npm install
npx prisma migrate deploy
npm run seed                # crée le compte ADMIN
npm run dev                 # http://localhost:4000

# Interface
cd ../client
npm install
npm run dev                 # http://localhost:5173
```

Connexion administrateur : matricule `ADMIN`, mot de passe défini par `ADMIN_PASSWORD` dans `server/.env`.

## Profils

| Profil | Accès |
|---|---|
| Agent | Enregistre son empreinte une fois, pointe arrivée et départ, voit ses heures du jour. |
| Administrateur | Registre, filtres, relevé PDF, régularisations, comptes des agents, journal, zone. |
| Admin. technique | Zone de pointage uniquement (adresses IP, centre et rayon GPS). |

## Ce que fait chaque pointage

1. Le téléphone donne sa position (jamais enregistrée).
2. Le capteur vérifie l'empreinte et signe un défi unique ; le Port ne reçoit qu'une clé publique.
3. Le serveur vérifie l'adresse IP (Wi-Fi de la Direction), la zone, puis la signature.
4. Premier pointage du jour : arrivée. Second : départ. Ensuite, la journée est close.
5. Chaque arrivée, départ, refus, enrôlement et régularisation apparaît dans la « Main courante ».

## Sécurité

- Une seule empreinte par agent ; seul un administrateur peut la réinitialiser (changement de téléphone).
- Mots de passe provisoires à changer obligatoirement à la première connexion.
- Connexion limitée à 10 essais par quart d'heure.
- `TRUST_PROXY` vaut 0 en accès direct et 1 derrière Nginx : l'en-tête `X-Forwarded-For` ne peut pas être falsifié.
- Toute opération sensible (régularisation, comptes, zone) est inscrite au journal des opérations.

## Limites techniques à connaître

- Un navigateur ne peut pas lire le nom du Wi-Fi : le contrôle repose sur l'IP publique fixe de la Direction.
- La position GPS d'un téléphone peut être falsifiée ; c'est le contrôle de l'IP qui empêche de pointer hors du site.
- L'empreinte exige HTTPS hors `localhost`. En production, renseigner `RP_ID` (domaine) et `ORIGIN` (URL https).
- Les coordonnées du `.env.example` sont indicatives : régler la zone depuis l'écran « Zone de pointage ».

## Documentation

- [Guide de l'agent](docs/guide-agent.md)
- [Guide de l'administrateur](docs/guide-administrateur.md)
- [Documentation technique et mise en production](docs/technique.md)
- [Déploiement sur Vercel (test et pilote)](docs/vercel.md)
