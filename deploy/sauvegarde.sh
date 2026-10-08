#!/bin/sh
# Sauvegarde quotidienne de la base, conservee 30 jours.
# Crontab : 30 2 * * * /opt/pointage-pad/deploy/sauvegarde.sh
# Identifiants dans ~/.my.cnf (section [mysqldump]), jamais en clair ici.
set -eu
DOSSIER=/var/backups/pointage-pad
mkdir -p "$DOSSIER"
FICHIER="$DOSSIER/pointage_pad-$(date +%F).sql.gz"
mysqldump --single-transaction --routines pointage_pad | gzip > "$FICHIER"
find "$DOSSIER" -name 'pointage_pad-*.sql.gz' -mtime +30 -delete
# Copie hors du serveur (cahier des charges, section 7) : adapter la destination
# rsync -a "$FICHIER" sauvegarde@serveur-distant:/sauvegardes/pointage-pad/
