# Changelog

Todas as mudanças relevantes do **TorqueLab** serão documentadas neste arquivo, seguindo o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [2026-11-27] - vercel-postgres-storage

### Adicionado
- Suporte nativo ao **Postgres via Vercel Storage / Neon (`POSTGRES_URL` / `DATABASE_URL`)** com pacote `pg` no adaptador dual (`server/db/adapter.mjs`), convertendo automaticamente placeholders `?` para `$1, $2, ...` (`RF-01`, `RN-03`).
- Trava explícita contra disco efêmero na Vercel (`VERCEL=1` + `NODE_ENV=production` sem Postgres retorna `503 POSTGRES_CONFIG_MISSING`) e mapeamento de falhas de rede/conexão para `503 POSTGRES_CONNECTION_ERROR` preservando erros de unicidade `23505` (`409 Conflict`) (`RN-01`, `RN-02`).

### Corrigido / Alterado
- Removida dependência do Turso (`@libsql/client`, `TURSO_*`) em `package.json`, `.env.example` e `server/index.mjs`.
- Ajustados `server/auth/db.mjs` e `server/dashboard/db.mjs` para compatibilidade total entre PostgreSQL e SQLite (`INSERT ... ON CONFLICT DO NOTHING`, `LOWER(email)`, índices únicos funcionais `LOWER(...)` no Postgres e `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), mantendo `node:sqlite` (`:memory:` e `./data/torquelab.sqlite`) intacto para desenvolvimento local, Docker e testes offline (`RF-02`, `RF-03`).
- Atualizada suíte `server/vercel.test.mjs` cobrindo *cold start* Postgres, unicidade `23505 -> 409`, trava `503` e alinhamento de dependências (`23/23` em `npm run test:api`).

## [2026-11-27] - vercel-fullstack-deploy

### Adicionado
- Deploy full-stack unificado na **Vercel** (`vercel.json` + entrypoint *serverless* `api/[...route].mjs`) servindo o Frontend Expo Web (`dist/`) e todas as rotas `/api/*` no mesmo domínio (`same-origin`), eliminando bloqueios de CORS em produção e previews (`RF-01`, `RN-01`).
- **[RF-02 / RN-02]** Adaptador assíncrono dual de banco de dados (`server/db/adapter.mjs`) suportando `@libsql/client` (**Turso**) em produção na Vercel (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`) e `node:sqlite` localmente, no Docker e nos testes (`:memory:`), com bloqueio explícito (`503 TURSO_CONFIG_MISSING`) caso `VERCEL=1` + `NODE_ENV=production` rode sem Turso configurado.
- **[RF-03]** Inicialização idempotente de schema, migrations (`updated_by`, `last_revision_km`) e seeds sob singleton `initPromise` para *cold start* *serverless* (`server/auth/db.mjs`, `server/dashboard/db.mjs`).
- Suítes de testes automatizados em `server/db/adapter.test.mjs` (10 testes) e `server/vercel.test.mjs` (6 cenários BDD cobrindo *same-origin*, *cold start*, trava `VERCEL=1` sem Turso, `/api/vehicles/:plate`, CORS `204`/`403` e alinhamento Docker/Vercel).

### Corrigido / Alterado
- Convertidos os serviços e rotas de `auth`, `dashboard` e `admin` para execução assíncrona (`async/await`) sobre o adaptador dual, mantendo persistência global de bloqueio de login (`failed_login_count`, `locked_until`) e retorno `503` em falhas de conexão Turso (`RN-04`, `RN-05`).
- Atualizado `app/(tabs)/services/plateApi.ts` (`resolvePlateApiEndpoint`) para suportar `same-origin` e caminhos relativos `/api/vehicles` (`RF-04`).
- Fixado `"engines": { "node": "24.x" }` em `package.json` para garantir `argon2Sync` nativo na Vercel (`RN-03`).
- Alinhados `Dockerfile`, `docker-compose.yml` e `.env.example` para `WEB_BASE_PATH=/`, `EXPO_PUBLIC_API_BASE_URL=same-origin` e `EXPO_PUBLIC_PLATE_API_URL=/api/vehicles` em ambiente Docker local (`RF-05`).

## [2026-11-26] - admin-dashboard

### Adicionado
- Painel Administrativo completo (`AdminDashboardView`) integrado ao `AdminPortalShell` dentro de `RoleGuard`, com 4 KPIs em tempo real (**Usuários cadastrados**, **Carros no catálogo**, **Carros de usuários** e **Catálogo de manutenções e serviços**), botão **"Atualizar dados"** com timestamp da última sincronização e 4 abas de navegação (**Visão Geral**, **Catálogo de Carros**, **Carros de Usuários** e **Catálogo de Manutenções**) (`RF-01`, `RF-02`, `RF-03`, `RF-04`, `RF-05`).
- **[RN-01]** Validação estrita no servidor (`server/admin/validators.mjs`) e inline nos modais `CatalogVehicleModal` e `CatalogServiceModal`, impedindo valores inválidos (como `baseCost` negativo com HTTP `400`) e duplicidades de veículos/serviços (HTTP `409 Conflict`).
- **[RN-02]** Desativação lógica segura (`PATCH` com `active: false`) nos catálogos de carros e serviços, bloqueio explícito de exclusão física `DELETE /api/admin/catalog/*` com HTTP `405 Method Not Allowed` e preservação integral de veículos de usuários e registros históricos em `maintenance_logs`.
- **[RN-03]** Endpoints REST administrativos protegidos por JWT + RBAC (`role === "admin"`, `401`/`403`), paginação obrigatória (`limit <= 100`), mascaramento de e-mail dos proprietários (`b***@exemplo.com`), ranking `topModels` e auditoria `updated_by` no SQLite: `GET /api/admin/overview`, `GET /api/admin/user-vehicles`, `GET/POST /api/admin/catalog/vehicles`, `PATCH /api/admin/catalog/vehicles/:id`, `GET/POST /api/admin/catalog/services` e `PATCH /api/admin/catalog/services/:id`.
- **[RN-04]** Cliente HTTP administrativo (`lib/admin/adminClient.ts`) com timeout dedicado de 15 segundos via `AbortController`, isolamento de falhas por bloco com botão **"Tentar novamente"** e preservação dos campos preenchidos nos modais em caso de erro `400`/`409`.
- Suíte de testes automatizados `npm run test:admin` (11 testes cobrindo os 6 cenários BDD de `specs/admin-dashboard.md`, `DELETE 405`, imutabilidade histórica e timeout de 15s).

### Corrigido / Alterado
- Adicionada opção de **KM da última revisão (`lastRevisionKm`)** no cadastro e edição de veículos (`UserVehicleModal`, `db.mjs`, `validators.mjs`, `dashboardService.mjs` e `maintenanceEngine.mjs`) com opção **"Sim, sei a KM da última"** (sugestão automática de marco) ou **"Não sei o histórico (usado)"**, evitando alertas falsos de atraso acumulado para carros cadastrados com quilometragem rodada.
- Estendido o banco SQLite (`server/dashboard/db.mjs`) com migrações idempotentes para `updated_by` em `catalog_vehicles` e `catalog_services`, `last_revision_km` em `user_vehicles` e índice composto `idx_user_vehicles_brand_category_deleted`.
- Adicionado `createDefaultAuthClient` em `lib/auth/defaultAuthClient.ts` para suportar timeout customizado de 15s em `lib/admin/defaultAdminClient.ts`.

## [2026-11-25] - user-dashboard

### Adicionado
- Dashboard principal do usuário autenticado (`UserDashboardView`) com seletor multi-veículo, KPIs consolidados (nota de saúde 0–100, consumo estimado `km/L` ou `km/kWh`, manutenções pendentes, próximo marco de KM e custo total dinâmico) e estado vazio orientado com opção de carro de demonstração (`RF-01`, `RF-02`, `RF-03`, `RF-05`).
- **[RN-01]** Cadastro e edição completos de veículos (via Catálogo interno TorqueLab ou Tabela FIPE), validação de quilometragem (`0..2.000.000`), apelido (≤ 40 chars), meses desde última revisão (`0..120`), limite de 20 veículos ativos por conta (HTTP `422`) e confirmação explícita de regressão de hodômetro (HTTP `409` → `confirmKmRegression: true`).
- **[RN-02]** Motor de cálculo de manutenções (`server/dashboard/maintenanceEngine.mjs`) com omissão automática de serviços `combustionOnly` para veículos elétricos, classificação por urgência (**Atrasada / Urgente**, **Recomendada agora** e **Próxima revisão**), preços arredondados ao múltiplo de 5 (`roundToNearest5`), registro de valor pago real no histórico sem alterar o catálogo global e preservação do histórico de serviços desativados.
- **[RN-03]** Endpoints REST autenticados com isolamento estrito por proprietário (`ownerId`): `GET /api/dashboard`, `GET /api/catalog/vehicles`, `GET/POST /api/user/vehicles`, `PATCH/DELETE /api/user/vehicles/:id`, `POST /api/user/vehicles/:id/select` e `GET/POST /api/user/maintenance-logs`.
- **[RN-04]** Degradação graciosa com cache local por usuário (`dashboardCache.ts`), banner de erro não destrutivo com recarregamento, selo `"FIPE em cache"`, fallback via catálogo interno e exclusão segura via soft delete promovendo automaticamente o próximo veículo ativo.
- Integração bidirecional com o Simulador Completo (`RF-04`) pré-preenchendo o carro ativo e sincronizando nota e consumo de volta ao Dashboard.
- Suíte de testes automatizados `npm run test:dashboard` (9 testes cobrindo todos os cenários BDD de `specs/user-dashboard.md`).

### Corrigido / Alterado
- Estendido o banco SQLite (`server/dashboard/db.mjs`) com tabelas `catalog_vehicles`, `catalog_services`, `user_vehicles` e `maintenance_logs` e seed idempotente de 9 veículos e 8 serviços iniciais.
- Atualizado `app/(tabs)/index.tsx` para exibir o Dashboard autenticado na aba principal mantendo o Modo Visitante intacto.

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
