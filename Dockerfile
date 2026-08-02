FROM node:25-alpine AS base
WORKDIR /app
RUN npm install --global pnpm@10.32.1

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
ARG BUILD_DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$BUILD_DATABASE_URL
ENV ADMIN_EMAIL=build@example.invalid
ENV ADMIN_PASSWORD_HASH=scrypt:16384:8:1:build-salt:build-hash
ENV SESSION_SECRET=build-only-session-secret
ENV PROJECT_TOKEN_PEPPER=build-only-project-token-pepper
ENV APP_URL=https://build.invalid
RUN pnpm build

FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
