#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting the NestJS API..."
exec node dist/src/main
