# ---- Stage 1: build ---------------------------------------------------------
# Same Node as .nvmrc. Alpine: a small Linux.
FROM node:26-alpine AS build
WORKDIR /app

# better-sqlite3 is native code: npm may have to compile it, which needs these.
RUN apk add --no-cache python3 make g++

# Dependencies first: as long as package*.json and the schema do not change,
# Docker reuses this layer and skips `npm ci` on the next build.
# `postinstall` runs `prisma generate`, hence the schema and its config.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# Then the code, and the compilation: TypeScript -> dist/main.js
COPY . .
RUN npm run build

# ---- Stage 2: run -----------------------------------------------------------
# A fresh image: no compiler, no src/, only what the API needs to start.
FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production

# node_modules from the build stage: `node dist/main.js` needs it.
# It keeps the dev dependencies, because `prisma` and `tsx` run at startup.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json prisma.config.ts ./
COPY prisma ./prisma

# The same port as PORT, everywhere.
EXPOSE 3000

# At each start: apply the migrations, fill the database, start the API.
# CHOIX : the seed runs at every start. It only creates what is missing (the
# staff account, and the demo on an empty database), so a restart loses nothing.
# No `start:dev`: no file watching in production.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/main.js"]
