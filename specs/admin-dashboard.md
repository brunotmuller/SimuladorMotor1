# Dashboard do Administrador (Métricas e Gestão de Catálogos) - Especificação de Funcionalidade

## 1. História de Usuário Refinada
**Como** administrador do TorqueLab,  
**Quero** visualizar um Dashboard administrativo com indicadores consolidados da plataforma (usuários cadastrados, carros no catálogo, carros cadastrados por usuários, catálogo de manutenções e serviços) e gerenciar o catálogo de carros e o catálogo de manutenções/serviços,  
**Para que** eu acompanhe o crescimento e o uso real do aplicativo e mantenha veículos de referência, intervalos e preços-base de manutenção sempre atualizados para todos os usuários.

## 2. Dependências
- `specs/auth-roles.md` (autenticação obrigatória e verificação estrita de papel `role === "admin"`).
- `specs/user-dashboard.md` (consome o catálogo de carros e o catálogo de manutenções/serviços mantidos pelo Admin e alimenta a contagem de carros de usuários).

## 3. Regras de Negócio e Casos de Borda

### Requisitos Funcionais de Referência
- **[RF-01] Cards de Métricas Principais (KPIs em Tempo Real):** Exibir no topo do Dashboard Admin os indicadores consolidados retornados por `GET /api/admin/overview`:
  1. **Usuários cadastrados:** total geral, ativos e novos nos últimos 30 dias.
  2. **Carros no catálogo:** total de modelos cadastrados no catálogo oficial da plataforma (ativos e inativos).
  3. **Carros de usuários:** total de veículos adicionados nas garagens dos usuários e média de veículos por usuário ativo.
  4. **Catálogo de manutenções e serviços:** total de itens/serviços ativos no catálogo de manutenção.
- **[RF-02] Visão de Carros dos Usuários (Analítica / Somente Leitura):** Exibir listagem paginada e filtrável (por marca, categoria, faixa de km ou busca textual) dos veículos cadastrados pelos usuários — mostrando marca, modelo, ano, km atual, categoria e identificador/e-mail mascarado ou nome do proprietário — além de ranking dos modelos mais cadastrados.
- **[RF-03] Gestão (CRUD) do Catálogo de Carros:** Permitir ao administrador listar (com busca, filtro por marca/categoria/status e paginação), **criar**, **editar** e **ativar/desativar** veículos do catálogo (`/api/admin/catalog/vehicles`):
  - Campos mínimos: marca, modelo, ano(s) de referência, categoria/tier (`compact`, `medium_suv`, `diesel_pickup`, `premium`, `electric`), tipo de combustível, fator multiplicador de custo de manutenção (`costFactor`), consumo de referência (km/L ou km/kWh) e status (`active`).
- **[RF-04] Gestão (CRUD) do Catálogo de Manutenções e Serviços:** Permitir ao administrador listar (com busca, filtro por categoria/combustão/status e paginação), **criar**, **editar** e **ativar/desativar** serviços de manutenção (`/api/admin/catalog/services`):
  - Campos mínimos: nome do serviço, categoria (ex.: `motor`, `freios`, `pneus`, `fluidos`, `elétrica`, `filtros`), quilometragem de intervalo (`intervalKm`), prazo opcional em meses (`intervalMonths`), custo-base em BRL (`baseCost`), flag `combustionOnly` (booleano), descrição/observação técnica e status (`active`).
- **[RF-05] Atualização e Navegação:** Permitir atualizar os indicadores sob demanda (botão `"Atualizar dados"` com timestamp da última sincronização) e alternar entre as abas/seções do painel: **Visão Geral**, **Catálogo de Carros**, **Carros de Usuários** e **Catálogo de Manutenções**.

### Regras de Negócio e Exceções
- **[RN-01] Validação dos Catálogos:**
  - **Catálogo de Carros:**
    - `brand` e `model`: obrigatórios, 2 a 80 caracteres.
    - Combinação única de `(brand, model, year, fuel)` normalizada (duplicidade retorna HTTP `409 Conflict`).
    - `costFactor`: número decimal entre `0.50` e `5.00`.
    - `year`: inteiro entre `1950` e `(anoAtual + 2)`.
  - **Catálogo de Manutenções e Serviços:**
    - `name`: obrigatório, 3 a 100 caracteres, único (case-insensitive; duplicidade retorna HTTP `409 Conflict`).
    - `intervalKm`: inteiro ≥ `1.000` e ≤ `300.000`.
    - `intervalMonths`: opcional; quando informado, inteiro ≥ `1` e ≤ `120`.
    - `baseCost`: número decimal ≥ `0` e ≤ `100.000`.
  - Falhas de validação retornam HTTP `400 Bad Request` com detalhamento por campo.
- **[RN-02] Integridade Referencial (Desativação vs Exclusão Física):**
  - Itens do catálogo de carros ou do catálogo de manutenções **não podem sofrer exclusão física (`DELETE`)** caso já estejam referenciados por veículos de usuários ou histórico de manutenções realizadas; deve-se utilizar **soft delete / desativação (`active = false`)**.
  - Ao alterar `baseCost` ou `intervalKm` de um serviço ativo, a alteração passa a valer para cálculos futuros no Dashboard do Usuário, sem sobrescrever valores já registrados em manutenções históricas concluídas.
- **[RN-03] Segurança, Autorização e Auditoria:**
  - Todos os endpoints `/api/admin/*` exigem JWT válido (HTTP `401 Unauthorized` se ausente/expirado) E papel `role === "admin"` (HTTP `403 Forbidden` para qualquer `user`).
  - Toda operação de escrita (`POST`, `PUT`/`PATCH`) em catálogos deve registrar metadados de auditoria (`updatedBy`, `updatedAt`, `createdAt`).
  - Listagens devem impor paginação obrigatória (`page ≥ 1`, `limit` padrão `20`, máximo `100`) para evitar sobrecarga de memória/banco.
- **[RN-04] Tratamento de Falhas e Consistência:**
  - Em erro de carregamento de um bloco específico (ex.: falha na tabela de carros de usuários), os demais KPIs/abas devem continuar operacionais com fallback localizado e botão `"Tentar novamente"`.
  - Timeout padrão das requisições administrativas: 15 segundos. Em caso de conflito de edição concorrente ou erro interno, retornar HTTP `409` ou `500` com mensagem clara sem perder os dados preenchidos no formulário de edição.
  - *Hipótese registrada:* A contagem de "Usuários cadastrados" contabiliza contas com papel `user` por padrão (exibindo separadamente ou em tooltip quantos são `admin`), evitando distorcer métricas de adoção.

## 4. Critérios de Aceite (BDD / Gherkin)

- **Cenário 1 (Caminho Feliz — Visualização dos KPIs no Dashboard Admin):**
  - **Dado** que o sistema possui 120 usuários cadastrados, 45 carros ativos no catálogo, 185 carros cadastrados por usuários e 14 serviços ativos no catálogo de manutenção
  - **Quando** o administrador autenticado acessa o Dashboard Admin (`GET /api/admin/overview`)
  - **Então** a API retorna HTTP `200 OK` e o painel exibe os 4 cards de indicadores com os valores exatos (`120`, `45`, `185`, `14`) e o horário da última atualização.

- **Cenário 2 (Caminho Feliz — Criar novo serviço no catálogo de manutenções):**
  - **Dado** que o administrador está na aba `"Catálogo de Manutenções"`
  - **Quando** preenche o formulário com nome `"Troca de fluido de arrefecimento"`, `intervalKm: 40000`, `intervalMonths: 24`, `baseCost: 260`, `combustionOnly: false` e salva (`POST /api/admin/catalog/services`)
  - **Então** o backend persiste o serviço com auditoria (`updatedBy`), retorna HTTP `201 Created`, incrementa o KPI de catálogo de manutenções e o novo serviço passa a ser considerado nos cálculos do Dashboard do Usuário.

- **Cenário 3 (Caminho Feliz — Desativar carro do catálogo já usado por usuários):**
  - **Dado** que o veículo `"Fiat Argo 1.0 2022"` do catálogo já está vinculado a 12 veículos de usuários
  - **Quando** o administrador clica em `"Desativar"` nesse item do catálogo (`PATCH /api/admin/catalog/vehicles/:id`)
  - **Então** o item é marcado como `active = false` (HTTP `200 OK`), deixa de aparecer para novos cadastros de catálogo, mas os 12 veículos já salvos nas garagens dos usuários permanecem íntegros.

- **Cenário 4 (Caminho Feliz — Filtrar carros de usuários):**
  - **Dado** que existem carros cadastrados por diversos usuários na plataforma
  - **Quando** o administrador acessa a aba `"Carros de Usuários"` e filtra pela marca `"Toyota"`
  - **Então** o painel exibe apenas os veículos da marca `"Toyota"` cadastrados pelos usuários, respeitando a paginação configurada.

- **Cenário 5 (Tratamento de Erro — Validação de serviço duplicado ou preço negativo):**
  - **Dado** que já existe o serviço `"Óleo do motor + filtro de óleo"` no catálogo
  - **Quando** o administrador tenta criar outro serviço com o mesmo nome ou com `baseCost: -50`
  - **Então** o backend rejeita com HTTP `409 Conflict` (duplicidade) ou HTTP `400 Bad Request` (valor negativo) e exibe a mensagem de erro no campo correspondente sem fechar o modal/formulário.

- **Cenário 6 (Segurança — Acesso bloqueado para usuário comum):**
  - **Dado** que um usuário autenticado possui papel `user`
  - **Quando** envia uma requisição para `GET /api/admin/overview` ou `POST /api/admin/catalog/services`
  - **Então** o backend recusa a operação com HTTP `403 Forbidden` e nenhuma alteração é realizada.

## 5. Fora de Escopo (Non-goals)
- Edição, suspensão ou exclusão de contas de usuários comuns e edição direta de veículos privados dos usuários pelo Admin (moderação de contas pode ser especificada futuramente em `specs/admin-user-management.md`).
- Exportação de relatórios em CSV/PDF ou dashboards de BI com séries temporais complexas.
- Controle financeiro, faturamento, assinaturas ou planos pagos (billing).
- Importação em lote via planilha (bulk import CSV/XLSX) para os catálogos.
