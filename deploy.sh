#!/bin/bash
# ==============================================================================
# BayaEstate - One-Click Deployment Script for WHM / cPanel Server
# ==============================================================================

set -e # Exit immediately on error

echo "🚀 [1/5] Pulling latest code from GitHub..."
git pull origin main

echo "📦 [2/5] Installing dependencies..."
npm install --production=false

echo "🗄️ [3/5] Syncing database schema with Prisma..."
npx prisma generate
npx prisma db push --accept-data-loss
npx tsx prisma/seed-5-properties.ts || true

echo "🔨 [4/5] Building Next.js production bundle..."
npm run build

echo "🔄 [5/5] Restarting application..."
# Always notify Phusion Passenger (cPanel):
mkdir -p tmp
touch tmp/restart.txt
echo "✅ Phusion Passenger reloaded via tmp/restart.txt!"

# If using PM2:
if command -v pm2 &> /dev/null; then
    pm2 restart noidaprimeproperty || pm2 restart bayaestate || pm2 start server.js --name "noidaprimeproperty"
    echo "✅ PM2 process restarted successfully!"
fi

echo "🎉 Deployment completed successfully! Website is LIVE."
