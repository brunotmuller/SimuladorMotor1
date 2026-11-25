# Dashboard do Usuário (Veículos e Manutenções) - Especificação de Funcionalidade

## 1. História de Usuário Refinada
**Como** usuário autenticado do TorqueLab,  
**Quero** visualizar a página principal do app como um Dashboard focado no meu carro ativo e nas manutenções necessárias — com possibilidade de alternar entre múltiplos carros cadastrados e abrir o simulador/edição completa,  
**Para que** eu acompanhe rapidamente a saúde do veículo, saiba o que precisa ser trocado na quilometragem atual, controle quanto vou gastar e mantenha o histórico de manutenção em dia.

## 2. Dependências
- `specs/auth-roles.md` (autenticação, identificação do proprietário `userId` e sessão ativa).
- `specs/admin-dashboard.md` (fonte do catálogo de carros e do catálogo de manutenções/serviços com preços-base e intervalos).

## 3. Regras de Negócio e Casos de Borda

### Requisitos Funcionais de Referência
- **[RF-01] Seletor de Veículos da Garagem:** Exibir barra/seletor no topo do Dashboard listando os veículos cadastrados pelo usuário (ex.: apelido, marca, modelo, ano e km atual), destacando o veículo ativo e permitindo cadastrar um novo veículo (`+ Adicionar carro`) ou editar o atual.
- **[RF-02] Resumo do Carro Ativo (Hero / KPIs do Veículo):** Exibir cards consolidados do veículo ativo:
  - Identificação (marca, modelo, ano, combustível, valor FIPE de referência e placa opcional).
  - Quilometragem atual (com edição rápida para atualizar o hodômetro).
  - Nota geral de saúde do veículo (0 a 100) e consumo estimado (provenientes do motor de análise existente).
  - Resumo de status de manutenção (quantidade de itens vencidos/pendentes, próximo marco de km e custo total estimado dos itens selecionados).
- **[RF-03] Painel de Manutenções Necessárias:** Listar automaticamente os serviços aplicáveis ao veículo ativo com base na quilometragem atual e no perfil do veículo (compacto, médio/SUV/turbo, diesel/picape, premium, elétrico):
  - Classificação visual clara por urgência: **Atrasada / Urgente**, **Recomendada agora** (atingiu a quilometragem ou prazo em meses desde a última revisão) e **Próxima revisão**.
  - Valor estimado de cada item (calculado a partir do preço-base do catálogo × fator da categoria do veículo) e **valor total** dinâmico conforme o usuário marca/desmarca itens.
  - Ação **"Marcar como realizada"** em cada item (registrando data, km realizada e valor pago opcional), recalculando o próximo vencimento do item.
- **[RF-04] Integração com o Simulador Completo e Calculadora de Viagem:** Manter acesso rápido (botão/aba/drawer) a partir do Dashboard para abrir o simulador detalhado (condição dos pneus, calibragem, peso, tipo de uso, análise completa e simulador de viagem) já preenchido com os dados do veículo ativo, permitindo salvar uma nova análise vinculada ao carro.
- **[RF-05] Estado Vazio (Onboarding):** Quando o usuário ainda não possui nenhum veículo cadastrado, exibir estado vazio orientado com CTA principal **"Cadastrar meu primeiro carro"** (via Tabela FIPE ou catálogo do TorqueLab) e opção secundária de visualizar um carro de demonstração.

### Regras de Negócio e Exceções
- **[RN-01] Validação de Veículo e Quilometragem:**
  - Um usuário pode cadastrar múltiplos veículos (limite padrão: 20 veículos ativos por conta; acima disso retornar HTTP `422 Unprocessable Entity`).
  - `currentKm`: inteiro ≥ `0` e ≤ `2.000.000`. Ao atualizar o hodômetro de um veículo já cadastrado, se o novo valor for menor que o `currentKm` anterior, exibir confirmação explícita de correção de digitação antes de persistir (evitando regressão acidental do histórico).
  - `nickname` (apelido): opcional, até 40 caracteres.
  - `lastRevisionMonths`: inteiro ≥ `0` e ≤ `120`.
- **[RN-02] Cálculo de Manutenções Aplicáveis e Custos:**
  - Veículos elétricos (`fuel` / categoria elétrica) devem omitir automaticamente itens exclusivos de combustão (`combustionOnly = true`, como óleo de motor, velas, correia dentada/acessórios e filtro de combustível).
  - Um serviço do catálogo entra como **Necessário agora** quando:
    1. Nunca foi registrado como concluído para o veículo e `currentKm >= item.intervalKm`; OU
    2. Já foi concluído na quilometragem `lastDoneKm` e `(currentKm - lastDoneKm) >= item.intervalKm`; OU
    3. Possui periodicidade em meses (`intervalMonths`) e o tempo decorrido desde `lastDoneAt` (ou `lastRevisionMonths`) atingiu ou superou o prazo.
  - Itens vencidos há mais de 20% do intervalo (ou > 2.000 km acima do marco) recebem badge **Urgente**.
  - O preço exibido de cada item é `roundToNearest5(service.baseCost * vehicleCategory.costFactor)`. Se o usuário editar manualmente o valor ao marcar o serviço como realizado, o valor real pago é salvo no histórico sem alterar o catálogo global.
  - Serviços desativados (`active = false`) pelo Admin no catálogo não aparecem em novas recomendações, mas permanecem visíveis no histórico já concluído do usuário.
- **[RN-03] Segurança, Isolamento de Dados e Permissões:**
  - Todas as rotas `/api/dashboard`, `/api/user/vehicles/*` e `/api/user/maintenance-logs/*` exigem usuário autenticado (HTTP `401`).
  - Isolamento estrito por proprietário (`ownerId === session.userId`): tentar visualizar, editar, registrar manutenção ou excluir um veículo de outro usuário deve retornar HTTP `403 Forbidden` ou `404 Not Found` (sem vazar existência do registro).
- **[RN-04] Tratamento de Falhas e Degradação Graciosa:**
  - Se a API externa da Tabela FIPE estiver indisponível (timeout > 8s ou HTTP `5xx`), o Dashboard continua carregando normalmente com o último valor FIPE salvo em banco (exibindo selo `"FIPE em cache"`), e o cadastro de carro permite selecionar veículos do catálogo interno mantido pelo Admin.
  - Se o endpoint `/api/dashboard` falhar (HTTP `500`/`503` ou offline), exibir banner de erro não destrutivo com ação **"Recarregar painel"** preservando eventual último estado em cache local.
  - Exclusão de um veículo exige confirmação explícita e remove (soft delete) o veículo e sua vinculação ativa; caso fosse o veículo ativo, o Dashboard seleciona automaticamente o próximo veículo da garagem (ou exibe o estado vazio).

## 4. Critérios de Aceite (BDD / Gherkin)

- **Cenário 1 (Caminho Feliz — Carregamento do Dashboard com carro ativo e manutenções):**
  - **Dado** que o usuário está autenticado e possui um `"Toyota Corolla 2022"` ativo com `60.000 km` e nenhum registro recente de troca de óleo ou velas
  - **Quando** acessa a tela inicial do app
  - **Então** o Dashboard exibe os KPIs do Corolla (nota, km atual, valor FIPE, total de alertas), lista os serviços necessários para `60.000 km` com valor individual de cada item e exibe o valor total somado.

- **Cenário 2 (Caminho Feliz — Alternar entre múltiplos carros):**
  - **Dado** que o usuário possui 2 veículos cadastrados (`"Toyota Corolla 2022"` a `60.000 km` e `"BYD Dolphin 2024"` elétrico a `20.000 km`)
  - **Quando** seleciona o `"BYD Dolphin 2024"` no seletor de garagem
  - **Então** o Dashboard atualiza os cards de resumo para o Dolphin, oculta serviços exclusivos de combustão (como troca de óleo do motor) e recalcula a lista de manutenções e o valor total para `20.000 km`.

- **Cenário 3 (Caminho Feliz — Registrar manutenção realizada):**
  - **Dado** que o item `"Óleo do motor + filtro de óleo"` (intervalo de `10.000 km`) aparece como necessário para o carro com `60.000 km`
  - **Quando** o usuário clica em `"Marcar como realizada"`, informa que foi feita a `60.000 km` por `R$ 420,00` e confirma
  - **Então** o backend salva o registro no histórico (HTTP `201 Created`), o item sai da lista de pendências atuais, o próximo vencimento é recalculado para `70.000 km` e o custo total pendente é atualizado imediatamente.

- **Cenário 4 (Caminho Feliz — Abrir simulador completo a partir do Dashboard):**
  - **Dado** que o usuário está visualizando o `"Jeep Compass 2021"` no Dashboard
  - **Quando** clica em `"Abrir simulador completo"`
  - **Então** o fluxo do simulador abre pré-preenchido com marca, modelo, ano e quilometragem do Compass, permitindo ajustar pneus/calibragem/uso e atualizar a nota de saúde do veículo no Dashboard.

- **Cenário 5 (Caso de Borda — Novo usuário sem veículos cadastrados):**
  - **Dado** que o usuário acabou de criar a conta e não possui veículos na garagem
  - **Quando** acessa o Dashboard do Usuário
  - **Então** o app exibe o estado vazio com o botão `"Cadastrar meu primeiro carro"` e uma opção secundária para testar um veículo de demonstração.

- **Cenário 6 (Tratamento de Erro — Quilometragem inválida ou acesso a veículo de terceiro):**
  - **Dado** que o usuário tenta atualizar a quilometragem do veículo para `-500` ou envia uma requisição `PATCH /api/user/vehicles/:outroId`
  - **Quando** a requisição é processada pelo backend
  - **Então** para quilometragem inválida a API retorna HTTP `400 Bad Request` com mensagem clara no campo, e para veículo de outro usuário retorna HTTP `403 Forbidden`/`404 Not Found` sem alterar dados.

## 5. Fora de Escopo (Non-goals)
- Agendamento online direto com oficinas mecânicas parceiras ou pagamentos dentro do app.
- Notificações push agendadas por e-mail/SMS/WhatsApp (alertas são exibidos in-app no Dashboard).
- Leitura automática de hodômetro via dispositivo OBD-II / Bluetooth.
- Upload de notas fiscais com leitura OCR automática.
