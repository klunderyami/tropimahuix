# syntax=docker/dockerfile:1

FROM node:22-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.node.json ./
COPY server ./server
RUN npm run server:build

FROM node:22-slim AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist ./server/dist

USER node
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
