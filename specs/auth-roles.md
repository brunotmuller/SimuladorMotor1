# Autenticação e Controle de Acesso (RBAC) - Especificação de Funcionalidade

## 1. História de Usuário Refinada
**Como** visitante, usuário cadastrado ou administrador do TorqueLab,  
**Quero** realizar cadastro, login, logout e ser direcionado automaticamente para o painel compatível com o meu papel (`user` ou `admin`),  
**Para que** meus veículos e histórico de manutenções fiquem protegidos e sincronizados no servidor, e apenas administradores tenham acesso aos dados agregados e catálogos da plataforma.

## 2. Dependências
- Nenhuma dependência funcional prévia (esta especificação é pré-requisito para `specs/user-dashboard.md` e `specs/admin-dashboard.md`).

## 3. Regras de Negócio e Casos de Borda

### Requisitos Funcionais de Referência
- **[RF-01] Cadastro de Usuário:** Permitir criação de conta com nome completo, e-mail e senha. Todo auto-cadastro nasce obrigatoriamente com papel `user`.
- **[RF-02] Autenticação (Login/Logout):** Autenticar por e-mail e senha, emitindo token de acesso (`access_token`) e token de renovação (`refresh_token`), com suporte a encerramento de sessão (`logout`) revogando o `refresh_token`.
- **[RF-03] Roteamento por Papel:** Ao autenticar ou restaurar sessão válida, o app redireciona usuários com papel `user` para o Dashboard do Usuário e usuários com papel `admin` para o Dashboard do Administrador (permitindo ao `admin` alternar para a visão de usuário quando desejar testar/usar sua própria garagem).
- **[RF-04] Perfil da Sessão Atual:** Expor endpoint `GET /api/auth/me` retornando `id`, `name`, `email`, `role`, `status` e `createdAt` do usuário autenticado.

### Regras de Negócio e Exceções
- **[RN-01] Validação de Dados de Cadastro e Login:**
  - `name`: obrigatório, 2 a 80 caracteres após `trim()`.
  - `email`: obrigatório, formato RFC válido, normalizado em minúsculas (`trim().toLowerCase()`), único no banco de dados (retornar HTTP `409 Conflict` se já cadastrado).
  - `password`: obrigatória, mínimo de 8 caracteres e máximo de 72 caracteres, contendo ao menos 1 letra e 1 dígito.
  - Em falha de validação de payload, retornar HTTP `400 Bad Request` com lista de campos inválidos sem expor detalhes internos.
- **[RN-02] Segurança, Criptografia e Permissões (RBAC):**
  - Senhas jamais podem ser armazenadas em texto puro; utilizar hash adaptativo forte (`bcrypt` com custo ≥ 10 ou `Argon2id`).
  - Tokens JWT assinados com expiração curta para `access_token` (15 min) e `refresh_token` rotativo com expiração de 7 dias (armazenado com hash no banco e em `SecureStore` no mobile / `HttpOnly` cookie ou storage seguro no web).
  - O campo `role` enviado no payload de auto-cadastro deve ser ignorado pelo servidor (sempre forçar `user`); a promoção para `admin` ocorre exclusivamente via seed inicial de ambiente ou ação administrativa protegida.
  - Proteção contra força bruta: rate limit de 10 tentativas de login por minuto por IP e bloqueio temporário de 15 minutos após 5 falhas consecutivas na mesma conta (retornar HTTP `429 Too Many Requests`).
  - Mensagens de falha de login devem ser genéricas (`"E-mail ou senha inválidos."`, HTTP `401 Unauthorized`) para evitar enumeração de contas.
  - Tentativa de acesso a rota exclusiva de `admin` por usuário `user` deve retornar HTTP `403 Forbidden`.
  - Contas com `status = "inactive"` ou `"blocked"` não podem efetuar login nem renovar token (HTTP `403 Forbidden`).
- **[RN-03] Tratamento de Falhas e Resiliência:**
  - Requisições autenticadas com token ausente, malformado ou expirado retornam HTTP `401 Unauthorized`; o cliente deve tentar uma única renovação automática via `POST /api/auth/refresh` antes de redirecionar para a tela de login.
  - Em indisponibilidade do banco ou erro inesperado, retornar HTTP `503 Service Unavailable` ou `500 Internal Server Error` com mensagem amigável e sem vazar stack traces.
  - Timeout padrão do cliente para chamadas de autenticação: 10 segundos, com feedback visual e botão "Tentar novamente".
- **[RN-04] Compatibilidade com Visitantes (Hipótese Registrada):**
  - *Hipótese:* Visitantes não autenticados podem acessar uma tela de entrada/login com opção de testar o simulador em modo demonstração sem persistência em nuvem; para acessar o Dashboard persistido (múltiplos carros e histórico), é obrigatório estar autenticado.

## 4. Critérios de Aceite (BDD / Gherkin)

- **Cenário 1 (Caminho Feliz — Cadastro de novo usuário):**
  - **Dado** que um visitante acessa a tela de cadastro e informa nome `"Bruno Silva"`, e-mail `"bruno@exemplo.com"` e senha `"Torque2026"`
  - **Quando** envia o formulário para `POST /api/auth/register`
  - **Então** o sistema cria o usuário com papel `user` e senha criptografada, retorna HTTP `201 Created` com os tokens de sessão e redireciona para o Dashboard do Usuário.

- **Cenário 2 (Caminho Feliz — Login de Administrador):**
  - **Dado** que existe uma conta ativa com papel `admin` para `"admin@torquelab.com"`
  - **Quando** o administrador informa e-mail e senha válidos em `POST /api/auth/login`
  - **Então** o sistema retorna HTTP `200 OK` com `role: "admin"` e tokens válidos, e o aplicativo abre o Dashboard do Administrador.

- **Cenário 3 (Tratamento de Erro — E-mail duplicado no cadastro):**
  - **Dado** que já existe um usuário registrado com `"bruno@exemplo.com"`
  - **Quando** alguém tenta cadastrar novamente com `"BRUNO@exemplo.com"`
  - **Então** a API rejeita a requisição com HTTP `409 Conflict` e exibe a mensagem `"Este e-mail já está em uso."`.

- **Cenário 4 (Segurança — Tentativa de escalação de privilégio e acesso indevido):**
  - **Dado** que um usuário autenticado possui papel `user`
  - **Quando** ele tenta acessar qualquer endpoint `/api/admin/*` ou acessar diretamente a rota do Dashboard Admin
  - **Então** o backend retorna HTTP `403 Forbidden` e o front-end redireciona o usuário para o Dashboard do Usuário com aviso de permissão insuficiente.

- **Cenário 5 (Tratamento de Erro — Credenciais inválidas e Rate Limit):**
  - **Dado** que um usuário informa senha incorreta 5 vezes consecutivas na tela de login
  - **Quando** realiza a 6ª tentativa dentro da janela de 15 minutos
  - **Então** a API retorna HTTP `429 Too Many Requests` informando o tempo aproximado para tentar novamente, enquanto as 5 primeiras tentativas retornam HTTP `401 Unauthorized` com `"E-mail ou senha inválidos."`.

- **Cenário 6 (Expiração e Renovação de Sessão):**
  - **Dado** que o `access_token` do usuário expirou, mas o `refresh_token` continua válido
  - **Quando** o app solicita dados do dashboard e recebe HTTP `401 Unauthorized`
  - **Então** o cliente renova automaticamente a sessão via `POST /api/auth/refresh` e repete a requisição original sem interromper o usuário.

## 5. Fora de Escopo (Non-goals)
- Login social (OAuth com Google, Apple ou GitHub).
- Autenticação em dois fatores (2FA / MFA).
- Recuperação de senha via envio de e-mail transacional ou SMS (pode ser especificado futuramente em `specs/password-recovery.md`).
- Gestão avançada de permissões granulares além dos papéis `user` e `admin`.
