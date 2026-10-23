#!/usr/bin/env bash
# Dump the app's MySQL database to a gzipped, timestamped file outside the app
# folder. Run by deploy.sh before anything changes, and daily from cron.
# Fails loudly (non-zero exit) if the dump is missing or empty.
set -euo pipefail
cd "$(dirname "$0")/backend"

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/exalted}"
KEEP_DAYS="${KEEP_DAYS:-60}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Read the DB credentials with Laravel's own .env parser (handles quoting).
CNF="$(mktemp)"
trap 'rm -f "$CNF"' EXIT
chmod 600 "$CNF"
php -r '
    require "vendor/autoload.php";
    $e = Dotenv\Dotenv::createArrayBacked(getcwd())->load();
    if (($e["DB_CONNECTION"] ?? "") !== "mysql") { fwrite(STDERR, "DB_CONNECTION is not mysql\n"); exit(1); }
    printf("[client]\nhost=%s\nport=%s\nuser=%s\npassword=\"%s\"\n",
        $e["DB_HOST"] ?? "127.0.0.1", $e["DB_PORT"] ?? "3306", $e["DB_USERNAME"],
        addcslashes($e["DB_PASSWORD"] ?? "", "\\\""));
    file_put_contents("php://fd/3", $e["DB_DATABASE"]);
' >"$CNF" 3>"$CNF.db"
DB="$(cat "$CNF.db")"
rm -f "$CNF.db"

FILE="$BACKUP_DIR/${DB}-$(date +%Y%m%d-%H%M%S).sql.gz"
mysqldump --defaults-extra-file="$CNF" --single-transaction --routines --triggers \
    --no-tablespaces "$DB" | gzip >"$FILE"

# A real dump ends with mysqldump's completion marker; anything else is a failure.
if ! gzip -dc "$FILE" | tail -n 1 | grep -q "Dump completed"; then
    echo "Backup FAILED: $FILE is incomplete" >&2
    exit 1
fi
chmod 600 "$FILE"

find "$BACKUP_DIR" -name '*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "Backup OK: $FILE ($(du -h "$FILE" | cut -f1))"

# People & Places images are files, not database rows. They are copied into one
# folder that only ever grows: every upload has its own file name, so a replaced
# or deleted image stays in the backup, and nothing is copied twice.
IMAGES="storage/app/private/wiki"
if [ -d "$IMAGES" ]; then
    mkdir -p "$BACKUP_DIR/wiki-images"
    chmod 700 "$BACKUP_DIR/wiki-images"
    rsync -a "$IMAGES/" "$BACKUP_DIR/wiki-images/"
    echo "Images OK: $BACKUP_DIR/wiki-images ($(du -sh "$BACKUP_DIR/wiki-images" | cut -f1))"
fi
