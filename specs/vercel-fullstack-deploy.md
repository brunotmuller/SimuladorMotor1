# Deploy Full-Stack na Vercel (API Serverless + Turso/libSQL + Same-Origin & Docker Local) - Especificação Técnica

## 1. História de Usuário Refinada
**Como** responsável pela engenharia e operação do **TorqueLab**,  
**Quero** publicar o Frontend Expo Web e a API Node.js em conjunto na **Vercel** (eliminando a dependência do OnRender, resolvendo definitivamente bloqueios de CORS e a incompatibilidade de `Dockerfile`/SQLite em disco na Vercel), mantendo o **Docker** funcional para execução e testes locais,  
**Para que** autenticação, garagem do usuário, painel administrativo e consulta de placas funcionem em produção com baixa latência, persistência real em banco de dados e zero configuração manual de CORS entre domínios distintos.

---

## 2. Diagnóstico Técnico dos Problemas Atuais
1. **Incompatibilidade de Docker e SQLite local na Vercel:**
   - A Vercel **não executa `Dockerfile`** nem mantém sistema de arquivos persistente entre invocações *serverless*. O uso atual de `node:sqlite` (`DatabaseSync`) gravando em `./data/torquelab.sqlite` resulta em perda de dados ou falha de escrita em produção *serverless*.
2. **Bloqueios de CORS (`Cross-Origin Resource Sharing`):**
   - Ao hospedar o frontend em `*.vercel.app` e a API em outro domínio (anteriormente OnRender), toda requisição com `Authorization` ou `Content-Type: application/json` dispara *preflight* `OPTIONS`. Qualquer divergência entre o domínio de *preview* da Vercel, `ALLOWED_ORIGINS` ou URLs `http://localhost:3001` embutidas no build causa erro `403 Origem não permitida` / `net::ERR_FAILED`.
3. **Configurações divergentes entre Docker, `plateApi.ts` e `app.json`:**
   - Em `Dockerfile`, `EXPO_PUBLIC_PLATE_API_URL` aponta por padrão para `http://localhost:3001/api/vehicles` em vez de `/api/vehicles` (`same-origin`).
   - Em `docker-compose.yml`, `WEB_BASE_PATH` ainda referencia `/SimuladorMotor1`, enquanto `app.json` já serve na raiz `/`.
   - Em `package.json`, não há fixação explícita de `"engines": { "node": "24.x" }` para garantir `argon2Sync` nativo no runtime da Vercel.

---

## 3. Dependências
- `specs/auth-roles.md` (Autenticação JWT + `Argon2id` + RBAC)
- `specs/user-dashboard.md` (Garagem, catálogos e cálculo preventivo)
- `specs/admin-dashboard.md` (Métricas e CRUD administrativo)

---

## 4. Requisitos Funcionais e Arquiteturais

- **[RF-01] Arquitetura Unificada Same-Origin na Vercel (`vercel.json` + Catch-All API):**
  - O frontend estático exportado pelo Expo (`dist/`) e todas as rotas `/api/*` devem ser servidos sob o **mesmo domínio** da Vercel.
  - Criar *entrypoint serverless* compatível com Vercel (ex.: `api/[...route].mjs` ou handler único roteado por `vercel.json`), reutilizando a lógica de roteamento de `server/index.mjs` (`admin`, `auth`, `dashboard`, `vehicles/:plate` e `health`) sem duplicar regras de negócio.
- **[RF-02] Camada de Persistência Dual (SQLite Local + Turso/libSQL na Vercel):**
  - Criar adaptador de banco assíncrono (`server/db/adapter.mjs`) suportando dois *drivers* com a mesma interface SQL (`exec`, `get`, `all`, `run`, `transaction`):
    1. **Modo Remoto (Vercel/Produção):** `@libsql/client` conectado via `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`.
    2. **Modo Local (Dev/Docker/Testes):** `node:sqlite` (`DatabaseSync`) usando `AUTH_DB_PATH` (`./data/torquelab.sqlite` ou `:memory:`).
- **[RF-03] Inicialização Idempotente em Cold Start (Schema + Migrations + Seeds):**
  - Em ambientes *serverless* (sem processo persistente), o *cold start* da função API deve garantir, no máximo uma vez por instância em memória (`initPromise` singleton), que o schema, colunas incrementais (`updated_by`, `last_revision_km`), catálogos padrão e admin inicial (`ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`) existam no Turso/SQLite antes de atender a primeira requisição.
- **[RF-04] Resolução Same-Origin no Frontend (`authClient.ts` e `plateApi.ts`):**
  - Quando `EXPO_PUBLIC_API_BASE_URL` estiver vazio ou definido como `same-origin` em navegador fora das portas de dev (`8081`, `8082`, `19006`), o cliente deve resolver para a origem atual (`window.location.origin` ou caminho relativo `/api/...`).
  - `plateApi.ts` deve aceitar `/api/vehicles` ou `same-origin` (resolvendo para `${window.location.origin}/api/vehicles`), evitando dependência de `http://localhost:3001` no bundle de produção.
- **[RF-05] Preservação do Docker apenas para Execução Local / Self-Hosting:**
  - Corrigir `Dockerfile` e `docker-compose.yml` para alinhar `WEB_BASE_PATH=/`, `EXPO_PUBLIC_API_BASE_URL=same-origin` e `EXPO_PUBLIC_PLATE_API_URL=/api/vehicles`, servindo apenas para desenvolvimento e homologação local em container.

---

## 5. Regras de Negócio e Casos de Borda

- **[RN-01] Política de CORS e Same-Origin:**
  - Requisições *same-origin* (mesmo host/protocolo da Vercel ou Docker local) não dependem de cabeçalhos CORS para passar no navegador, mas o servidor deve continuar respondendo `204 No Content` ao preflight `OPTIONS` para origens explicitamente autorizadas em `ALLOWED_ORIGINS` (ex.: `http://localhost:8081` em testes locais contra API remota ou domínios extras configurados).
  - Nunca usar `Access-Control-Allow-Origin: *` em rotas autenticadas com `Authorization`.
  - Origens não autorizadas em chamadas *cross-origin* continuam recebendo `403 Forbidden` (`{ "error": "Origem não permitida." }`).
- **[RN-02] Seleção Automática e Segurança de Banco (`Turso` vs `SQLite`):**
  - Se `TURSO_DATABASE_URL` estiver configurada, o backend usa **obrigatoriamente** o driver `@libsql/client` (exigindo `TURSO_AUTH_TOKEN` para URLs `libsql://` ou `https://`).
  - Se `NODE_ENV=production` e `VERCEL=1` (ambiente Vercel detectado) **sem** `TURSO_DATABASE_URL` definida, a inicialização da API deve falhar explicitamente com erro claro de configuração (`503` + log de diagnóstico), impedindo silentemente gravar em SQLite efêmero `/tmp` ou `./data` na Vercel.
  - Em testes automatizados (`NODE_ENV=test`), o padrão continua sendo `node:sqlite` em `:memory:` para execução offline e determinística.
- **[RN-03] Runtime Node.js e Criptografia:**
  - `package.json` deve declarar `"engines": { "node": "24.x" }` para garantir suporte nativo a `argon2Sync` (`node:crypto`) na Vercel.
  - Todas as consultas em `authService`, `dashboardService` e `adminService` devem ser compatíveis com execução assíncrona (`async/await`) sobre transações SQL sem bloquear o *event loop* nem introduzir condições de corrida em *cold start*.
- **[RN-04] Tratamento de Falhas e Variáveis de Ambiente:**
  - Em `NODE_ENV=production`, `AUTH_JWT_SECRET` (mínimo 32 caracteres) permanece obrigatório no boot.
  - `FALCON_API_TOKEN`, `AUTH_JWT_SECRET`, `TURSO_AUTH_TOKEN`, `ADMIN_SEED_EMAIL` e `ADMIN_SEED_PASSWORD` nunca podem usar prefixo `EXPO_PUBLIC_`.
  - Falha de conexão com Turso ou timeout de rede deve retornar `503 Service Unavailable` com `{ "error": "Serviço temporariamente indisponível. Tente novamente em instantes." }`, sem vazar stack trace ou credenciais.
- **[RN-05] Rate Limiting em Ambiente Serverless:**
  - Reconhecer que o `Map` em memória de `attempts` / `failed_login_count` atua por instância quente na Vercel; bloqueio de conta por falhas consecutivas de login (`failed_login_count` e `locked_until` na tabela `users`) **deve** persistir no Turso para valer globalmente entre todas as instâncias *serverless*.

---

## 6. Critérios de Aceite (BDD / Gherkin)

- **Cenário 1 (Deploy Unificado Same-Origin na Vercel — Sem CORS):**
  - **Dado** que o frontend e a API estão publicados no mesmo domínio `https://torquelab.vercel.app` (ou em uma URL de *preview* `https://torquelab-abc123.vercel.app`)
  - **Quando** o usuário acessa a aplicação no navegador e envia `POST /api/auth/login` ou `GET /api/dashboard`
  - **Então** a requisição é enviada para a própria origem (`same-origin`), sem erro de *preflight* CORS, retornando `200 OK` e os dados da sessão.

- **Cenário 2 (Persistência no Turso entre Invocações Serverless):**
  - **Dado** que a API está rodando na Vercel conectada ao Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)
  - **Quando** um usuário cadastra um veículo via `POST /api/user/vehicles` em uma invocação e, em seguida, consulta `GET /api/dashboard` em uma nova instância (*cold start*)
  - **Então** o schema/seed não falha por duplicidade e o veículo cadastrado é retornado normalmente a partir do Turso.

- **Cenário 3 (Proteção contra SQLite Efêmero na Vercel):**
  - **Dado** que a aplicação está executando na Vercel (`VERCEL=1`, `NODE_ENV=production`) sem `TURSO_DATABASE_URL` configurada
  - **Quando** uma requisição chega à rota `/api/auth/login`
  - **Então** a API recusa gravar em disco efêmero local, registra log explícito de configuração ausente e responde `503 Service Unavailable` amigável.

- **Cenário 4 (Consulta de Placa Same-Origin na Vercel e no Docker):**
  - **Dado** que `EXPO_PUBLIC_PLATE_API_URL=/api/vehicles` está configurado no build Web
  - **Quando** o usuário solicita a busca de uma placa no simulador ou modal de veículo
  - **Então** o frontend requisita `/api/vehicles/:plate` no próprio host (sem chamar `http://localhost:3001`), recebendo resposta da rota serverless/Docker.

- **Cenário 5 (Preflight CORS para Origens Autorizadas vs Bloqueadas):**
  - **Dado** que `ALLOWED_ORIGINS` contém `http://localhost:8081`
  - **Quando** uma requisição `OPTIONS /api/auth/login` chega com `Origin: http://localhost:8081`
  - **Então** a API responde `204 No Content` com `Access-Control-Allow-Origin: http://localhost:8081`; e para uma origem externa não listada (ex.: `https://malicioso.exemplo`), responde `403 Forbidden`.

- **Cenário 6 (Docker Local Preservado para Desenvolvimento/Homologação):**
  - **Dado** que o desenvolvedor sobe o projeto via `docker compose up --build`
  - **Quando** acessa `http://localhost:3001`
  - **Então** o frontend estático é servido em `/`, comunica com `/api/*` em `same-origin` e persiste os dados no volume SQLite `/app/data/torquelab.sqlite`.

- **Cenário 7 (Regressão Zero nos Testes Existentes):**
  - **Dado** a migração do acesso ao banco para o adaptador assíncrono compatível com `node:sqlite` e `@libsql/client`
  - **Quando** são executadas as suítes `npm run test:api`, `npm run test:auth`, `npm run test:dashboard`, `npm run test:admin`, `npm run test:preventive`, `npx tsc --noEmit`, `npm run lint` e `npm run build`
  - **Então** todas passam com `0` erros usando SQLite `:memory:` sem necessidade de conexão externa.

---

## 7. Fora de Escopo (Non-goals)
- Configuração de deploy contínuo ou manutenção de infraestrutura no **OnRender** (plataforma descontinuada neste projeto).
- Migração do banco de dados para PostgreSQL, MySQL ou MongoDB.
- Implementação de Redis externo para *rate limit* distribuído por IP (mantém-se o bloqueio persistente por conta na tabela `users` no Turso).
- Builds nativos iOS/Android (EAS Build / lojas) — escopo restrito ao deploy Web + API na Vercel e container Docker local.
