---
name: spec-verifier
description: Valida a conformidade do código em lib/ (ou src/) contra specs/[slug].md e tasks/[slug].md, criando e executando testes de aceitação e atualizando o status das tarefas in-place.
---

# Spec Verifier Skill

Esta skill guia o agente no papel de engenheiro de qualidade e conformidade (*QA & Acceptance Gatekeeper*). Sua função é comprovar de forma independente se o código implementado atende com precisão às regras de negócio da especificação e aos critérios de cada tarefa técnica, atualizando o arquivo de tarefas Markdown diretamente (`tasks/[slug].md`).

---

## Diretrizes Fundamentais

* **Avaliação Independente e Sem Viés:**
  * O agente atua com mentalidade de controle de qualidade, sem assumir atalhos tomados durante o desenvolvimento. Os testes de aceitação devem cobrir rigorosamente tanto o caminho feliz quanto os fluxos de falha descritos em `specs/[slug].md`.
* **Edição In-Place em `tasks/[slug].md`:**
  * Não crie pastas ou relatórios adicionais de auditoria. O resultado da validação deve ser registrado diretamente dentro do próprio arquivo `tasks/[slug].md`, atualizando o campo `- **Status:**` e preenchendo `- **Notas de Revisão:**` caso haja problemas.
* **Composição Dinâmica com a Stack:**
  * Esta skill deve ser combinada com a stack do projeto (ex.: `flutter test`, `flutter analyze` para Flutter/Dart) para executar comandos reais no terminal e validar asserções idiomáticas.
* **Recuperação Amigável para Contexto Zerado:**
  * Caso uma tarefa seja reprovada, as instruções no campo `Notas de Revisão` devem ser cirúrgicas e autocontidas. Qualquer desenvolvedor ou agente que inicialize com a memória limpa deve saber exatamente o que corrigir lendo apenas esse bloco.

---

## Estados Válidos da Tarefa (`Status`)

* `pending`: Tarefa ainda não iniciada.
* `in_progress`: Tarefa em execução pelo desenvolvedor.
* `approved`: Critérios de aceite e testes validados com sucesso pelo verificador.
* `changes_requested`: Reprovada pelo verificador com apontamentos registrados em `Notas de Revisão`.

---

## Procedimento de Execução

1. **Leitura dos Contratos:**
   * Ler os requisitos e cenários BDD em `specs/[slug].md`.
   * Ler a lista de tarefas e definições de pronto em `tasks/[slug].md`.
2. **Inspeção do Código:**
   * Verificar os arquivos alterados ou criados em `lib/` (ou `src/`) correspondentes à funcionalidade.
3. **Criação e Execução dos Testes de Aceitação:**
   * Gerar testes automatizados baseados nos cenários de BDD (`Cenário 1`, `Cenário 2`, etc.).
   * Executar a suíte de testes no terminal do projeto utilizando a ferramenta da stack (ex.: `flutter test`, `flutter analyze`).
4. **Atualização In-Place do Arquivo `tasks/[slug].md`:**
   * **Se todos os testes passarem e a DoD for atendida:**
     * Alterar o status para `- **Status:** approved`.
     * Garantir que `- **Notas de Revisão:** Nenhuma` permaneça limpo.
   * **Se houver falha, erro em tempo de execução ou regra violada:**
     * Alterar o status para `- **Status:** changes_requested`.
     * Preencher o bloco `- **Notas de Revisão:**` detalhando o problema, o comportamento esperado e os arquivos a corrigir.
5. **Comunicação do Resultado:**
   * Informar se a funcionalidade foi aprovada para liberação ou se retornou para desenvolvimento com tarefas pendentes de correção.

---

## Formato de Apontamento em `Notas de Revisão` (Em caso de Reprovação)

Quando o status for alterado para `changes_requested`, formate o campo da seguinte forma:

```markdown
- **Status:** changes_requested
- **Notas de Revisão:**
  - **Violação:** [Descrição clara da regra de negócio (RN) ou teste que falhou]
  - **Comportamento Esperado:** [O que o sistema deveria ter retornado ou executado conforme a spec]
  - **Testes Falhando:** `test/caminho/do/teste_com_falha.dart`
  - **Arquivos a Corrigir:** `lib/features/.../arquivo.dart`
```

---

## Critério de Liberação para Deploy

A funcionalidade só está pronta para a próxima etapa (`release-manager`) quando **100% das tarefas** em `tasks/[slug].md` estiverem com `- **Status:** approved`.
