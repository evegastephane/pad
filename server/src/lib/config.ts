import 'dotenv/config';

const env = process.env;

export const config = {
  jwtSecret: env.JWT_SECRET ?? '',
  rpId: env.RP_ID ?? 'localhost',
  origin: env.ORIGIN ?? 'http://localhost:5173',
  port: Number(env.PORT ?? 4000),
  // Nombre de proxys de confiance devant l'API (1 = Nginx). 0 en accès direct.
  // Ne jamais mettre `true` : X-Forwarded-For deviendrait falsifiable.
  trustProxy: Number(env.TRUST_PROXY ?? 0),
  // Valeurs initiales de la zone, reprises en base au premier démarrage (EF-15)
  zoneDefaut: {
    ALLOWED_IPS: env.ALLOWED_IPS ?? '',
    ZONE_LAT: env.ZONE_LAT ?? '0',
    ZONE_LNG: env.ZONE_LNG ?? '0',
    ZONE_RADIUS: env.ZONE_RADIUS ?? '150',
  },
  clientDist: env.CLIENT_DIST ?? '',
};

if (config.jwtSecret.length < 16) throw new Error('JWT_SECRET manquant ou trop court (.env)');
