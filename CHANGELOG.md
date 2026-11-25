# Changelog

Todas as mudanças relevantes do **TorqueLab** serão documentadas neste arquivo, seguindo o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [2026-11-25] - auth-roles

### Adicionado
- Sistema completo de autenticação e controle de acesso por papéis (`user` e `admin`), permitindo cadastro, login, logout e roteamento automático para o Dashboard do Usuário ou Painel do Administrador (`RF-01`, `RF-02`, `RF-03`, `RF-04`).
- **[RN-01]** Validação estrita de cadastro e login (`name` de 2 a 80 caracteres, e-mail RFC normalizado e único com HTTP `409 Conflict`, senha de 8 a 72 caracteres com letra e dígito e resposta estruturada HTTP `400 Bad Request`).
- **[RN-02]** Segurança e RBAC no backend Node 24 com banco SQLite (`node:sqlite`), senhas em `Argon2id` nativo, JWT `HS256` (15 min), rotação atômica de `refresh_token` (7 dias) com revogação em cadeia na detecção de reuso, rate limit por IP (10 tentativas/min), bloqueio temporário de 15 minutos após 5 falhas consecutivas (`401` nas 5 primeiras e `429` + `Retry-After` na 6ª), proteção `/api/admin/*` (`403 Forbidden`) e seed idempotente do administrador inicial.
- **[RN-03]** Cliente HTTP (`lib/auth/authClient.ts`) com timeout de 10 segundos, renovação automática única em `401` via `POST /api/auth/refresh` (com deduplicação de requisições concorrentes) e `AuthContext` com restauração de sessão no boot.
- **[RN-04]** Tela mobile-first de Login/Cadastro (`AuthScreen`), `RoleGuard`, `AccountMenu`, `AdminPortalShell` e preservação do Modo Visitante (demonstração local) com particionamento da garagem preventiva por `user.id`.
- Novos endpoints REST: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/admin/health` e `GET /api/health`.
- Suíte de testes automatizados `npm run test:auth` cobrindo os 6 cenários BDD de `specs/auth-roles.md`.
- Empacotamento Docker unificado (`Dockerfile`, `docker-compose.yml`, `.dockerignore` e servidor estático `server/static.mjs`) servindo API, SQLite e Frontend Web em conjunto na porta `3001`.

### Corrigido / Alterado
- Atualizado `server/index.mjs` com suporte a CORS para `POST`/`Authorization`, detecção automática de `same-origin` e portas locais de desenvolvimento, preservando integralmente `/api/vehicles/:plate`.
- Atualizado `app/(tabs)/_layout.tsx` e `app/(tabs)/index.tsx` para integrar `AuthProvider`, roteamento por papel e escopo de armazenamento por `ownerId`.
