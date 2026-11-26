# ==============================================================================
# Stage 1: Build do Frontend Expo Web (gera o bundle estático em /app/dist)
# ==============================================================================
FROM node:24-slim AS builder

WORKDIR /app

# Instala dependências aproveitando o cache de camadas do Docker
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código-fonte do projeto
COPY . .

# URLs públicas injetadas no bundle Web em tempo de build
# (por padrão apontam para a mesma porta 3001 onde API + Frontend rodam juntos)
ARG EXPO_PUBLIC_API_BASE_URL=same-origin
ARG EXPO_PUBLIC_PLATE_API_URL=http://localhost:3001/api/vehicles
ENV EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}
ENV EXPO_PUBLIC_PLATE_API_URL=${EXPO_PUBLIC_PLATE_API_URL}
ENV HOME=/tmp

# Exporta o frontend estático para /app/dist
RUN npx expo export --platform web

# ==============================================================================
# Stage 2: Runtime leve (Node 24 nativo com API + SQLite + Frontend estático)
# ==============================================================================
FROM node:24-slim AS runtime

WORKDIR /app

# O backend usa apenas módulos nativos do Node 24 (node:http, node:sqlite, node:crypto),
# dispensando node_modules em produção e mantendo a imagem final leve e segura.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Diretório persistente para o banco SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3001
ENV SERVE_WEB_DIST=true
ENV WEB_DIST_DIR=/app/dist
ENV WEB_BASE_PATH=/
ENV AUTH_DB_PATH=/app/data/torquelab.sqlite
ENV ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001,http://localhost:8081,http://127.0.0.1:8081

EXPOSE 3001
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.API_PORT || 3001) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.mjs"]
