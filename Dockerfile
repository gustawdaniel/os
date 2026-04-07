# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Zainstaluj pnpm i openssl
RUN apt-get update -y && apt-get install -y openssl && npm install -g pnpm

# Skopiuj pliki zależności
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Zainstaluj zależności i wygeneruj klienta Prisma
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

# Skopiuj resztę plików i zbuduj aplikację
COPY . .
RUN pnpm build

# Stage 2: Run
FROM node:20-slim

WORKDIR /app

# Skopiuj pliki z etapu budowania
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expose port (SvelteKit adapter-node default to 3000)
EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "build"]
