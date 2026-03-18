FROM node:20-alpine
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source + generate Prisma client
COPY . .
RUN npx prisma generate

# Build Next.js (no DATABASE_URL needed at build time — all routes are dynamic)
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

EXPOSE 10000
ENV PORT=10000
ENV NODE_ENV=production

# start.sh handles prisma db push + node server.js
CMD ["bash", "start.sh"]
