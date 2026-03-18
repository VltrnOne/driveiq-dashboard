FROM node:20-slim
WORKDIR /app

# Install OpenSSL (required by Prisma engine)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source + generate Prisma client with correct binary targets
COPY . .
RUN npx prisma generate

# Build Next.js
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

EXPOSE 10000
ENV PORT=10000
ENV NODE_ENV=production

CMD ["/bin/sh", "-c", "sh start.sh"]
