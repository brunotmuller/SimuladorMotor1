---
name: git-commit
description: Elabora mensagens de commit padronizadas e realiza commits atômicos no Git seguindo rigorosamente as 7 regras de Chris Beams (https://cbea.ms/git-commit).
---

# Git Commit Skill (Chris Beams Standard)

Esta skill guia o agente na criação de commits atômicos e mensagens de commit claras, consistentes e de alto valor histórico, baseadas nas **7 regras de uma ótima mensagem de commit** definidas por Chris Beams (`https://cbea.ms/git-commit`).

Um `git diff` mostra **o quê** mudou, mas apenas a mensagem de commit explica adequadamente **por quê** a mudança foi feita.

---

## As 7 Regras Obrigatórias

Toda mensagem de commit gerada e executada por esta skill deve cumprir estritamente as 7 regras abaixo:

1. **Separe o assunto (subject) do corpo (body) com uma linha em branco:**
   * Mudanças triviais (ex.: correção de typo) podem conter apenas a linha de assunto.
   * Quando houver necessidade de contexto adicional, insira **exatamente uma linha em branco** entre o título e o corpo para que `git log --oneline`, `git shortlog` e `git rebase` funcionem corretamente.
2. **Limite a linha de assunto a 50 caracteres:**
   * Mire em até **50 caracteres** como regra prática e considere **72 caracteres** como limite rígido absoluto.
   * Se for difícil resumir em 50 caracteres, verifique se você não está tentando commitar alterações demais de uma só vez (prefira **commits atômicos**).
3. **Capitalize a linha de assunto:**
   * A primeira palavra da linha de assunto deve sempre começar com letra maiúscula (ex.: `Accelerate to 88 miles per hour` e nunca `accelerate to 88 miles per hour`).
4. **Não termine a linha de assunto com ponto final:**
   * Nunca coloque ponto (`.`) ou pontuação desnecessária ao final da linha de assunto (ex.: `Open the pod bay doors` e nunca `Open the pod bay doors.`).
5. **Use o modo imperativo na linha de assunto:**
   * Escreva como se estivesse dando um comando ou instrução (seguindo a própria convenção interna do Git em `Merge branch...` ou `Revert...`).
   * **Regra de ouro (Teste da Frase):** O assunto deve sempre completar gramaticalmente a frase:
     * *En-US:* `"If applied, this commit will [your subject line here]"` (ex.: *If applied, this commit will **refactor subsystem X for readability***).
     * *Pt-BR:* `"Se aplicado, este commit irá [sua linha de assunto aqui]"` (ex.: *Se aplicado, este commit irá **remover código boilerplate do template Tauri***).
   * Nunca use passado ou gerúndio no assunto (evite `Fixed bug`, `Fixing bug`, `Corrigido erro`, `Adicionando arquivo`).
6. **Quebre as linhas do corpo em 72 caracteres:**
   * O Git não quebra linhas automaticamente. Formate manualmente cada parágrafo do corpo (`body`) para não ultrapassar **72 colunas**, deixando margem para a indentação do `git log` dentro de terminais de 80 colunas.
7. **Use o corpo para explicar *o quê* e *por quê*, e não *como*:**
   * O código-fonte já mostra *como* a alteração funciona.
   * No corpo da mensagem, explique o problema que existia antes da alteração, por que a mudança foi necessária, o que mudou em alto nível e eventuais efeitos colaterais não óbvios.
   * Referências a tarefas ou issues (`Resolves: #123`, `Task: TASK-01`, `See also: specs/slug.md`) devem ficar no rodapé, separadas por uma linha em branco.

---

## Formato Padrão da Mensagem

```text
Summarize changes in around 50 characters or less

More detailed explanatory text, if necessary. Wrap it to about 72
characters or so. In some contexts, the first line is treated as the
subject of the commit and the rest of the text as the body. The
blank line separating the summary from the body is critical.

Explain the problem that this commit is solving. Focus on why you
are making this change as opposed to how (the code explains that).
Are there side effects or other unintuitive consequences of this
change? Here's the place to explain them.

 - Bullet points are okay, too

 - Typically a hyphen or asterisk is used for the bullet, preceded
   by a single space, with blank lines in between

Resolves: TASK-01
See also: specs/local-persistence-git-sync.md
```

---

## Procedimento de Execução

Sempre que o usuário acionar `/git-commit` ou solicitar a realização de um commit seguindo esta skill:

1. **Inspeção do Estado do Repositório:**
   * Executar `git status --short` e `git diff` (ou `git diff --staged`) para analisar todas as alterações pendentes.
2. **Avaliação de Atomicidade:**
   * Verificar se os arquivos modificados pertencem a uma única mudança lógica coesa.
   * Se houver mudanças de naturezas distintas misturadas na working tree, separar em múltiplos commits atômicos fazendo *stage* seletivo (`git add <arquivos>`) para cada unidade lógica.
3. **Redação e Validação das 7 Regras:**
   * Redigir o `subject` e o `body`.
   * Validar o checklist antes de executar o comando:
     - [ ] Assunto tem $\le 50$ caracteres (máximo absoluto de 72)?
     - [ ] Começa com letra maiúscula?
     - [ ] Termina **sem** ponto final?
     - [ ] Está no modo imperativo (passa no teste *"If applied, this commit will..."*)?
     - [ ] Há uma linha em branco separando assunto e corpo?
     - [ ] As linhas do corpo estão quebradas em até 72 caracteres?
     - [ ] O corpo explica o **quê** e o **porquê** em vez de descrever linha a linha do código?
4. **Execução do Commit via Linha de Comando:**
   * Executar o commit via CLI preservando quebras de linha exatas (ex.: múltiplos `-m` para parágrafos separados ou passando a mensagem formatada).
5. **Confirmação:**
   * Executar `git log -1` para exibir ao usuário o commit registrado no histórico.

