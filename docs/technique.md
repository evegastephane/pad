# Documentation technique

## Architecture

- `client/` : React 18, TypeScript, Vite, Tailwind, React Router, SimpleWebAuthn (navigateur).
  - `src/pages/Pointage.tsx` : écran agent. `src/pages/admin/*` : Registre, Agents, Zone, Journal.
  - `src/ui/kit.tsx` : composants de la charte (bandeau, emblème, boutons, champs). `src/ui/fiduciaire.tsx` : motifs guillochés générés en SVG (rosette, ondes, sceau, micro-texte).
- `server/` : Node.js, Express, Prisma (MySQL 8), SimpleWebAuthn, PDFKit, helmet, express-rate-limit.
  - `src/routes/` : `auth`, `webauthn`, `pointage`, `admin`.
  - `src/lib/` : configuration, contrôle de zone (paramètres en base), temps (fuseau de Douala), PDF, traces.
- En production, l'API sert aussi l'interface compilée (`CLIENT_DIST`) : une seule origine, requise par WebAuthn.

## Modèle de données

`User` (matricule, nom, service, profil `EMPLOYEE` / `ADMIN` / `TECH`, actif, mot de passe à changer),
`Credential` (clé publique WebAuthn, compteur), `Pointage` (un par agent et par jour, régularisation et motif),
`Notification`, `Parametre` (IP et zone, modifiables à chaud), `Journal` (opérations des administrateurs).

## API

| Méthode | Route | Profil |
|---|---|---|
| POST | `/api/auth/login` | public (10 essais / 15 min) |
| GET | `/api/me` · POST `/api/me/password` | connecté |
| POST | `/api/webauthn/register/options` · `/verify` | connecté, une seule empreinte |
| POST | `/api/pointage/options` · `/api/pointage` | connecté |
| GET | `/api/admin/pointages` (`du`, `au`, `service`, `userId`) · `/pdf` | ADMIN |
| POST | `/api/admin/pointages/regulariser` | ADMIN |
| GET | `/api/admin/aujourdhui` · `/notifications` · `/journal` · `/services` | ADMIN |
| GET/POST/PATCH | `/api/admin/users` · `/:id` · `/:id/password` · DELETE `/:id/credentials` | ADMIN |
| GET/PUT | `/api/admin/parametres` | ADMIN, TECH |

## Mise en production (Ubuntu LTS)

```bash
sudo apt install nginx mysql-server certbot python3-certbot-nginx
sudo npm install -g pm2

git clone <depot> /opt/pointage-pad && cd /opt/pointage-pad
(cd client && npm ci && npm run build)
cd server && npm ci && npm run build
cp .env.example .env
#   DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
#   RP_ID=pointage.exemple.cm   ORIGIN=https://pointage.exemple.cm
#   TRUST_PROXY=1               CLIENT_DIST=/opt/pointage-pad/client/dist
#   ALLOWED_IPS=<IP publique fixe de la Direction>
npx prisma migrate deploy && npm run seed

cd .. && pm2 start deploy/ecosystem.config.js && pm2 save && pm2 startup
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pointage   # adapter le domaine
sudo ln -s /etc/nginx/sites-available/pointage /etc/nginx/sites-enabled/
sudo certbot --nginx -d pointage.exemple.cm && sudo systemctl reload nginx
```

Sauvegardes : `deploy/sauvegarde.sh` en tâche cron quotidienne, avec copie hors du serveur. Tester une restauration
avant la mise en production (cahier des charges, section 5).

## Points de vigilance

- `TRUST_PROXY` doit valoir exactement le nombre de proxys (1 avec Nginx). La configuration Nginx fournie
  **remplace** `X-Forwarded-For` par l'adresse réelle du client.
- Changer `RP_ID` invalide toutes les empreintes enregistrées : à fixer avant l'enrôlement des agents.
- La position GPS n'est jamais stockée ; seul le résultat du contrôle (refus) est notifié.
