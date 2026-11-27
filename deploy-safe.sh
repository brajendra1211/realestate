#!/bin/bash
# Safe deploy for the cPanel server. Run as the app user (pronesto):  bash deploy-safe.sh
# - no --accept-data-loss (prisma stops and asks if a change would delete data)
# - no demo-user seeding
# - same build flags that work on this server

set -eo pipefail
cd /home/pronesto/app
source ~/nodevenv/app/22/bin/activate

echo "[1/5] Pulling latest code..."
git pull origin main

echo "[2/5] Generating Prisma client..."
npx prisma generate

echo "[3/5] Syncing database schema (safe mode)..."
npx prisma db push

echo "[4/5] Building..."
NODE_OPTIONS="--dns-result-order=ipv4first --max-old-space-size=3072" npx next build --webpack 2>&1 | tail -25

echo "[5/5] Restarting app..."
mkdir -p tmp
touch tmp/restart.txt

echo "Done. Site restarted."
