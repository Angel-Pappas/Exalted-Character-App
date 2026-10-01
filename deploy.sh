#!/usr/bin/env bash
# Deploy the latest pushed code to this VM. Run it from the live folder
# (/home/ploi/exalted.pappas.yoltobots.click) — never from the dev checkout.
set -euo pipefail
cd "$(dirname "$0")"

if ! grep -qx 'APP_ENV=production' backend/.env 2>/dev/null; then
    echo "Refusing to deploy: backend/.env is not the live (APP_ENV=production) config." >&2
    exit 1
fi

# Back up the live database first — the deploy aborts if the backup fails.
./backup-db.sh
git pull --ff-only
(cd backend && composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev)
npm ci
npm run build
(cd backend && php artisan migrate --force && php artisan optimize)
sudo systemctl reload php8.5-fpm
echo "exalted deployed: $(git log -1 --format='%h %s')"
