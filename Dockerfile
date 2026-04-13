# BaigDentPro — production image (Express + SPA from dist/)
# Build: docker build -t baigdentpro .
# Run:  docker run --env-file server/.env -p 3001:3001 baigdentpro
# Before first run against a new DB: docker run --rm --env-file server/.env baigdentpro \
#   sh -c "cd server && npx prisma migrate deploy"
# (Or run migrate from CI against DATABASE_URL.)

FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
RUN npm ci

COPY . .
RUN npm run build:production

ENV NODE_ENV=production
EXPOSE 3001
USER node
CMD ["node", "server/dist/index.js"]
