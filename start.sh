#!/usr/bin/env bash
# Bulletproof start wrapper — handles missing DATABASE_URL gracefully
# Render startCommand: bash start.sh

if [ -n "$DATABASE_URL" ]; then
  echo "[DriveIQ] Running prisma db push..."
  npx prisma db push --accept-data-loss 2>&1 || echo "[DriveIQ] prisma db push failed, continuing..."
else
  echo "[DriveIQ] No DATABASE_URL — skipping DB setup"
fi

exec node server.js
