FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/aws-icons/package.json ./packages/aws-icons/

RUN pnpm install --frozen-lockfile

COPY index.html tsconfig.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY public ./public
COPY packages ./packages
COPY src ./src

RUN pnpm typecheck && pnpm build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY docker/security-headers.conf /etc/nginx/conf.d/security-headers.snippet
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

USER 101
