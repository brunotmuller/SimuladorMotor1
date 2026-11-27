# Migração de Turso para Vercel Postgres (`Storage -> Neon/Postgres`) - Especificação Técnica

## 1. História de Usuário Refinada
**Como** responsável pela engenharia e operação do **TorqueLab**,  
**Quero** substituir o banco remoto **Turso (`libsql`)** pelo **Postgres provisionado diretamente no painel da Vercel (`Storage → Postgres / Neon`)** via `POSTGRES_URL` / `DATABASE_URL`, mantendo o **SQLite local (`node:sqlite`)** para desenvolvimento, Docker e testes automatizados,  
**Para que** toda a infraestrutura de produção (Frontend + API Serverless + Banco de Dados) fique centralizada dentro da própria Vercel, sem depender de contas externas nem de serviços fora do ar.

---

## 2. Dependências
- `specs/vercel-fullstack-deploy.md` (já implementada — entrypoint serverless `api/[...route].mjs`, `vercel.json`, `same-origin` e camada `server/db/adapter.mjs`)

---

## 3. Requisitos Funcionais e Arquiteturais

- **[RF-01] Driver Postgres (`pg`) no Adaptador Dual (`server/db/adapter.mjs`):**
  - Substituir o suporte remoto ao Turso (`@libsql/client`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) pelo driver padrão PostgreSQL (`pg` via `Pool`) mantendo a mesma interface assíncrona unificada (`driver`, `exec`, `get`, `all`, `run`, `transaction`, `close`).
  - Detectar automaticamente o modo `"postgres"` quando `POSTGRES_URL` ou `DATABASE_URL` estiver definida (com prioridade para `POSTGRES_URL` injetada pela Vercel Storage).
  - Converter automaticamente placeholders `?` (fora de literais string `'...'`) para `$1, $2, ...` no driver `"postgres"`, preservando todas as queries parametrizadas dos serviços sem duplicar SQL nos módulos de negócio.
- **[RF-02] Compatibilidade de Schema e Queries entre SQLite e Postgres:**
  - Remover construções exclusivas do SQLite nos arquivos compartilhados (`server/auth/db.mjs` e `server/dashboard/db.mjs`):
    - Substituir `INSERT OR IGNORE INTO ...` por `INSERT INTO ... ON CONFLICT DO NOTHING` (válido em SQLite 3.24+ e PostgreSQL).
    - Substituir `WHERE email = ? COLLATE NOCASE` por `WHERE LOWER(email) = LOWER(?)` (válido em ambos).
    - Criar schema condicional para `postgres` vs `sqlite`: no Postgres, usar `DOUBLE PRECISION` para colunas `REAL`, omitir `COLLATE NOCASE` e garantir unicidade case-insensitive via índices únicos funcionais (`LOWER(email)` em `users` e `LOWER(name)` em `catalog_services`).
    - Na migração idempotente de colunas (`updated_by` e `last_revision_km`), usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` no Postgres e manter `PRAGMA table_info(...)` no SQLite.
- **[RF-03] Preservação Total do SQLite Local, Docker e Testes:**
  - Sem `POSTGRES_URL` / `DATABASE_URL` definidas, o adaptador continua abrindo `node:sqlite` (`:memory:` em `NODE_ENV=test` e `./data/torquelab.sqlite` em dev/Docker), mantendo `docker compose up --build` e todas as suítes de teste 100% offline.

---

## 4. Regras de Negócio e Casos de Borda

- **[RN-01] Trava contra Disco Efêmero na Vercel:**
  - Se `VERCEL=1` e `NODE_ENV=production` **sem** `POSTGRES_URL` nem `DATABASE_URL` configuradas, a inicialização deve falhar explicitamente com `DatabaseAdapterError("POSTGRES_CONFIG_MISSING", ..., { status: 503 })` e log de diagnóstico, evitando gravação silenciosa em SQLite efêmero.
- **[RN-02] Pool Serverless, SSL e Erros Transitórios:**
  - Configurar `pg.Pool` com limite enxuto de conexões para funções *serverless* (`max: 5`) e SSL compatível com Neon/Vercel Postgres (respeitando `sslmode` da URL e `NODE_ENV=production`).
  - Mapear erros de conexão/rede/timeout do `pg` (`ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`, `57P*`, `08*`) para `DatabaseAdapterError("POSTGRES_CONNECTION_ERROR", "Serviço temporariamente indisponível. Tente novamente em instantes.", { status: 503 })`, preservando erros de domínio SQL como unicidade (`23505` / `SQLITE_CONSTRAINT`) para tratamento HTTP `409`.
- **[RN-03] Tratamento de `boolean` e `numeric` no Postgres:**
  - Garantir normalização consistente de `changes` (`result.rowCount ?? 0`) no método `run()` e conversão segura de tipos numéricos no `dashboardService` / `adminService`.
- **[RN-04] Segurança de Credenciais:**
  - `POSTGRES_URL`, `DATABASE_URL`, `AUTH_JWT_SECRET`, `FALCON_API_TOKEN`, `ADMIN_SEED_EMAIL` e `ADMIN_SEED_PASSWORD` nunca podem usar prefixo `EXPO_PUBLIC_`.
  - Atualizar `.env.example` removendo `TURSO_*` e documentando `POSTGRES_URL=` / `DATABASE_URL=`.

---

## 5. Critérios de Aceite (BDD / Gherkin)

- **Cenário 1 (Vercel + Postgres Storage conectado via `POSTGRES_URL`):**
  - **Dado** que `POSTGRES_URL` está configurada no ambiente da Vercel
  - **Quando** a função `api/[...route].mjs` inicia em *cold start* e recebe `POST /api/auth/login` ou `POST /api/user/vehicles`
  - **Então** o adaptador seleciona o driver `"postgres"`, cria tabelas/índices/seeds de forma idempotente, converte os parâmetros `?` para `$1..$n` e persiste os dados no Postgres da Vercel com `200`/`201`.

- **Cenário 2 (Trava de Segurança na Vercel sem Postgres):**
  - **Dado** que `VERCEL=1` e `NODE_ENV=production` estão ativos sem `POSTGRES_URL` nem `DATABASE_URL`
  - **Quando** uma requisição chega em `/api/auth/login`
  - **Então** a API retorna `503 Service Unavailable` com código interno `POSTGRES_CONFIG_MISSING` sem tentar gravar em SQLite efêmero.

- **Cenário 3 (Conflito de Unicidade Preservado no Postgres):**
  - **Dado** que um usuário já existe com e-mail `bruno@exemplo.com` no Postgres
  - **Quando** outro cadastro tenta usar `BRUNO@EXEMPLO.COM`
  - **Então** o erro de constraint `23505` não é convertido em `503`, sendo tratado pela camada de serviço como `409 Conflict`.

- **Cenário 4 (Falha de Rede com Postgres):**
  - **Dado** que o pool Postgres retorna falha de conexão (`ECONNREFUSED` ou `ETIMEDOUT`)
  - **Quando** uma rota autenticada consulta o banco
  - **Então** a API retorna `503 Service Unavailable` amigável sem expor a string de conexão ou credenciais.

- **Cenário 5 (Regressão Zero em SQLite Local, Docker e Testes Offline):**
  - **Dado** que `POSTGRES_URL` e `DATABASE_URL` não estão definidas localmente
  - **Quando** executamos `npm run test:api`, `npm run test:auth`, `npm run test:dashboard`, `npm run test:admin`, `npm run test:preventive`, `npx tsc --noEmit`, `npm run lint` e `npm run build`
  - **Então** todas as suítes passam com `0` erros usando `node:sqlite` (`:memory:` / `./data/torquelab.sqlite`).

---

## 6. Fora de Escopo (Non-goals)
- Suporte simultâneo ao Turso (`@libsql/client`), que será removido do projeto.
- Uso de ORMs pesados (Prisma, Drizzle, TypeORM) — mantém-se SQL direto sobre `pg` + `node:sqlite`.
- Alterações no frontend (`UserDashboardView`, `AdminDashboardView`, `AuthScreen`).
