#!/bin/sh
set -eu
# Prepare permissions only. Storage initialization is an explicit first-deploy hook.
mkdir -p "$CAMPUSFEST_STORAGE"
chown www-data:www-data "$CAMPUSFEST_STORAGE"
chmod 700 "$CAMPUSFEST_STORAGE"
exec apache2-foreground
