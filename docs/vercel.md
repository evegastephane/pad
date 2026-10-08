# Déploiement sur Vercel (phase de test / pilote)

Le dépôt se déploie tel quel : l'interface est servie en statique, l'API Express tourne dans une fonction
Vercel (`api/index.ts`), et la base MySQL est hébergée ailleurs (Vercel n'en fournit pas).

## 1. Créer une base MySQL en ligne (gratuite)

Par exemple **TiDB Cloud Serverless** (compatible MySQL, gratuit) ou **Aiven for MySQL** (offre gratuite).
Récupérez l'adresse de connexion au format :

```
mysql://UTILISATEUR:MOT_DE_PASSE@HOTE:PORT/pointage_pad?sslaccept=strict
```

(`?sslaccept=strict` : connexion chiffrée, exigée par ces services.)

## 2. Importer le projet dans Vercel

- **Root Directory : laisser vide** (racine du dépôt), et non `client`.
- Framework, commandes de build et dossier de sortie : laisser les valeurs par défaut, `vercel.json` les fournit.

## 3. Variables d'environnement (Settings → Environment Variables)

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | l'adresse de la base en ligne (étape 1) |
| `JWT_SECRET` | une longue chaîne aléatoire (32 caractères et plus) |
| `ADMIN_PASSWORD` | mot de passe du compte `ADMIN` (8 caractères minimum) |
| `RP_ID` | le domaine seul, ex. `pointage-pad.vercel.app` |
| `ORIGIN` | l'URL complète, ex. `https://pointage-pad.vercel.app` |
| `ALLOWED_IPS` | IP publique du Wi-Fi de la Direction (modifiable ensuite dans l'écran Zone) |
| `ZONE_LAT`, `ZONE_LNG`, `ZONE_RADIUS` | centre et rayon de la zone (idem) |

Puis **Redeploy**. Chaque build applique les migrations et crée le compte `ADMIN` s'il n'existe pas.

## Ce qui change par rapport au serveur classique

- L'adresse IP du client est lue dans l'en-tête `x-real-ip` posé par Vercel, que le client ne peut pas imposer.
- La limite de 10 tentatives de connexion est tenue par instance de fonction : elle reste efficace, mais moins stricte
  que sur un serveur unique.
- `RP_ID` doit correspondre exactement au domaine affiché dans le navigateur : changer de domaine oblige les agents à
  réenregistrer leur empreinte.

## Limites

- Le plan gratuit de Vercel (Hobby) est réservé à un usage personnel et non commercial. Pour l'exploitation par le Port,
  prévoir le plan Pro ou le serveur décrit dans [technique.md](technique.md).
- Les données des agents sont alors hébergées hors du Cameroun : à valider avec le service juridique (cahier des charges, section 7).
