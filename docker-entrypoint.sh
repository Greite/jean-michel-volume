#!/bin/sh
set -e

PUID=${PUID:-1001}
PGID=${PGID:-1001}

# Ensure the SQLite data dir is writable by the requested runtime user.
# On bind mounts / Unraid appdata the host ownership otherwise blocks writes.
mkdir -p /app/data
chown -R "${PUID}:${PGID}" /app/data 2>/dev/null || true

# Drop from root to the requested uid:gid and exec the app (CMD).
exec su-exec "${PUID}:${PGID}" "$@"
