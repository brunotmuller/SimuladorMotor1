---
name: spec-builder
description: Transforma prompts, ideias brutas ou User Stories incompletas em especificações funcionais formais salvas em specs/[slug].md, realizando entrevistas ativas (grill-me) quando necessário e definindo regras de negócio, casos de borda e critérios de aceite em BDD.
---

# Spec Builder Skill

Esta skill guia o agente no papel de analista de produto e requisitos, transformando entradas desestruturadas de usuários em especificações técnicas de produto limpas, desambiguadas e prontas para o planejamento de tarefas.

---

## Diretrizes Fundamentais

* **Nomenclatura Semântica de Arquivos (Sem Prefixos Numéricos):**
  * O nome do arquivo em disco deve utilizar apenas *kebab-case* semântico (ex.: `specs/user-auth.md` ou `specs/payment-checkout.md`).
  * Não utilize prefixos de etapa ou de ordenação nos arquivos (evite `01_` ou `001-`), prevenindo conflitos de merge no Git e redundância com o nome da pasta.
* **Identificadores Claros no Conteúdo:**
  * Dentro do arquivo, é incentivado o uso de identificadores alfanuméricos curtos para regras (`RN-01`, `RN-02`), requisitos (`RF-01`, `RF-02`), numeração de cenários (`Cenário 1`, `Cenário 2`), limites técnicos (status HTTP, timeouts, limites de taxa) para facilitar referências cruzadas em PRs e testes.
* **Fatiamento de Escopo (Bifurcação):**
  * Se a solicitação do usuário contiver múltiplos domínios ou funcionalidades distintas, não misture tudo em um arquivo só. Divida em arquivos separados na pasta `specs/`, informe o usuário sobre a divisão, mapeie dependências e sugira a ordem de prioridade.
* **Entrevista Ativa & Alinhamento (Grill-me):**
  * Não avance no escuro diante de requisitos ambíguos ou bifurcações críticas de produto. Se faltarem definições essenciais (regras de validação centrais, comportamento de conflito, escolhas de design/UX ou modelos de dados concorrentes), faça perguntas diretas, objetivas e numeradas ao usuário (com opções recomendadas) antes ou durante a elaboração da especificação.
  * Para detalhes secundários de implementação, deduza hipóteses razoáveis alinhadas com boas práticas de engenharia e registre explicitamente no documento para validação posterior.
* **Local de Destino:**
  * O artefato gerado deve ser salvo sempre no diretório `specs/` na raiz do projeto: `specs/[slug-da-funcionalidade].md`.

---

## Procedimento de Execução

1. **Análise de Entrada e Domínio:**
   * Analisar o prompt ou história de usuário recebida, identificando o objetivo central e eventuais domínios misturados.
   * Se houver mais de uma funcionalidade independente, separar os escopos e definir o *slug* semântico de cada arquivo.
2. **Entrevista e Esclarecimento (Grill-me):**
   * Se houver lacunas críticas, premissas de negócio indefinidas ou caminhos alternativos incompatíveis, faça perguntas claras ao usuário com opções recomendadas para cravar a decisão antes de redigir a especificação definitiva.
3. **Estruturação de Regras e Exceções:**
   * Estruturar as regras de negócio, casos de borda e cenários de exceção, identificando-os formalmente como `RN-01`, `RN-02`, etc.
4. **Critérios de Aceite em BDD:**
   * Redigir os cenários no formato BDD/Gherkin (*Dado / Quando / Então*), cobrindo caminho feliz e fluxos de falha numerados.
5. **Delimitação de Escopo:**
   * Registrar explicitamente o que está fora de escopo (Non-goals) para evitar escopo inflado (*scope creep*).
6. **Persistência do Artefato:**
   * Escrever o arquivo correspondente na pasta `specs/[slug].md`.
7. **Apresentação ao Usuário:**
   * Apresentar um resumo conciso apontando o arquivo criado, destacando as decisões tomadas e eventuais pontos em aberto.

---

## Estrutura Obrigatória do Artefato (`specs/[slug].md`)

O arquivo gerado em `specs/` deve seguir a estrutura abaixo:

```markdown
# [Nome da Funcionalidade] - Especificação de Funcionalidade

## 1. História de Usuário Refinada
**Como** [persona específica],  
**Quero** [ação clara e sem ambiguidade],  
**Para que** [resultado ou valor real de negócio].

## 2. Dependências
- [Referência a outra especificação se houver, ex: `specs/user-auth.md`, ou declarar "Nenhuma dependência"]

## 3. Regras de Negócio e Casos de Borda
- **[RN-01] Validação:** [Regras de formato, obrigatoriedade, tamanho e restrições]
- **[RN-02] Segurança e Permissões:** [Níveis de acesso, autenticação e limites de uso]
- **[RN-03] Tratamento de Falhas:** [Comportamento esperado em caso de erro, timeout ou indisponibilidade com códigos HTTP correspondentes]

## 4. Critérios de Aceite (BDD / Gherkin)
- **Cenário 1 (Caminho Feliz):**
  - **Dado** que [condição prévia]
  - **Quando** [evento ou ação disparada]
  - **Então** [resultado esperado observável]
- **Cenário 2 (Tratamento de Erro):**
  - **Dado** que [condição de falha ou dado inválido]
  - **Quando** [evento ou ação disparada]
  - **Então** [mensagem de erro amigável e status retornado]

## 5. Fora de Escopo (Non-goals)
- [Itens, fluxos ou integrações que não pertencem a esta entrega]
```
