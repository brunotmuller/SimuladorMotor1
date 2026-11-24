---
name: task-planner
description: Lê especificações funcionais em specs/[slug].md e as decompõe em planos técnicos de engenharia salvos em tasks/[slug].md, contendo grafo de dependências, camadas arquiteturais e critérios de conclusão (DoD).
---

# Task Planner Skill

Esta skill guia o agente no papel de arquiteto técnico e planejador de engenharia, transformando os requisitos de negócio e critérios de BDD de `specs/[slug].md` em um plano de tarefas atômicas e sequenciadas em formato Markdown (`tasks/[slug].md`).

---

## Diretrizes Fundamentais

* **Espelhamento 1:1 e Nomenclatura Semântica:**
  * O nome do arquivo gerado deve espelhar exatamente o *slug* da especificação correspondente: `specs/[slug].md` $\rightarrow$ `tasks/[slug].md`.
  * Nunca utilize prefixos numéricos no nome do arquivo (ex.: use `tasks/user-auth.md`, evite `tasks/02_user-auth.md`).
* **Atomicidade de Tarefa (Tamanho de Pull Request):**
  * Cada tarefa deve representar uma alteração autocontida e de escopo fechado, passível de ser implementada e testada em um único commit ou Pull Request.
* **Grafo de Dependências Explícito (DAG):**
  * Todas as tarefas devem declarar suas dependências imediatas no campo `Depende de`.
  * Tarefas de base (configuração de ambiente, esquemas de dados e contratos) devem ter `Depende de: Nenhuma` para permitir início imediato.
  * Tarefas dependentes só podem avançar após a conclusão das tarefas das quais dependem.
  * Inclua um diagrama visual em Mermaid no topo para facilitar a visualização do fluxo.
* **Cobertura Total da Especificação (DoR / Rastreabilidade):**
  * Cada regra de negócio (`RN-01`, `RN-02`) e cenário de aceite de `specs/[slug].md` deve estar explicitamente mapeada na `Definição de Conclusão (DoD)` de pelo menos uma tarefa técnica.
* **Isolamento de Contexto:**
  * O arquivo `tasks/[slug].md` deve ser autocontido. Quem for programar (humano ou agente de código) deve conseguir trabalhar lendo apenas esse arquivo de tarefas.
* **Local de Destino:**
  * O artefato gerado deve ser salvo sempre no diretório `tasks/` na raiz do projeto: `tasks/[slug-da-funcionalidade].md`.

---

## Fatiamento por Camadas Arquiteturais (`Camada`)

Ao decompor a funcionalidade, classifique cada tarefa entre:

* `config`: Configuração de ambiente, dependências, variáveis de ambiente ou credenciais.
* `data_model`: Schemas de banco de dados, migrações, modelos de domínio e tipagens estritas.
* `service`: Regras de negócio, serviços, repositórios, integrações com APIs/bancos locais e lógica central.
* `api_contract`: Endpoints REST/RPC, rotas, controladores e validação de payloads.
* `ui`: Componentes de tela, formulários, feedbacks visuais e estados de interface (carregamento, sucesso, erro).
* `test`: Testes unitários, de integração ou fixtures necessárias para a funcionalidade.

---

## Procedimento de Execução

1. Localizar e ler a especificação correspondente em `specs/[slug].md`.
2. Identificar as camadas necessárias para suportar todas as regras de negócio (`RN`) e cenários BDD.
3. Decompor a entrega em tarefas atômicas sequenciadas, definindo IDs no formato `TASK-01`, `TASK-02`, etc.
4. Mapear as dependências cruzadas entre as tarefas e gerar o grafo Mermaid correspondente.
5. Redigir uma `Definição de Conclusão (DoD)` clara, verificável e binária para cada item, referenciando as regras (`RN-xx`) atendidas.
6. Inicializar o status de cada tarefa como `pending`.
7. Salvar o arquivo resultante diretamente em `tasks/[slug].md`.
8. Apresentar ao usuário um resumo da ordem de execução e os pontos de atenção.

---

## Estrutura Obrigatória do Artefato (`tasks/[slug].md`)

O arquivo gerado em `tasks/` deve seguir a estrutura Markdown abaixo:

```markdown
# [Nome da Funcionalidade] - Plano Técnico de Tarefas

- **Especificação:** `specs/[slug].md`
- **Status Geral:** `pending`

## Grafo de Dependências

\`\`\`mermaid
graph TD
    TASK-01["TASK-01: Configuração/Modelos"] --> TASK-02["TASK-02: Serviço/Repositório"]
    TASK-02 --> TASK-03["TASK-03: UI"]
    TASK-03 --> TASK-04["TASK-04: Testes de Aceitação"]
\`\`\`

---

## Tarefas de Engenharia

### [TASK-01] [Título Conciso da Tarefa]
- **Camada:** `config` | `data_model` | `service` | `api_contract` | `ui` | `test`
- **Status:** `pending`
- **Depende de:** `Nenhuma`
- **Definição de Conclusão (DoD):**
  - [Critério objetivo e testável de conclusão, arquivos criados e RNs cobertas]
- **Notas de Revisão:** Nenhuma

### [TASK-02] [Título Conciso da Tarefa]
- **Camada:** `service`
- **Status:** `pending`
- **Depende de:** `TASK-01`
- **Definição de Conclusão (DoD):**
  - [Critério objetivo e testável de conclusão, arquivos criados e RNs cobertas]
- **Notas de Revisão:** Nenhuma
```
