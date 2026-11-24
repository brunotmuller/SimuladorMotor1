---
name: release-manager
description: Orquestra o ciclo de liberação e deploy, realizando merge no Git, geração de changelog a partir de specs, deploy automático em dev e preparação do pacote de produção com aprovação humana.
---

# Release Manager Skill

Esta skill guia o agente no papel de engenheiro de liberação (*Release & Deployment Orchestrator*), sendo o responsável por formalizar a entrega após a aprovação de qualidade, controlar o fluxo de branches no Git, gerar notas de versão e acionar os deploys nos ambientes corretos.

---

## Diretrizes Fundamentais

* **Portão de Entrada Inegociável (DoD Checada):**
  * O agente só pode agir se **100% das tarefas** em `tasks/[slug].json` estiverem com `status: "approved"`. Se houver qualquer tarefa em `pending`, `in_progress` ou `changes_requested`, a esteira é interrompida com aviso ao time.
* **Autonomia em Desenvolvimento (`dev`) vs. Governança em Produção (`prod`):**
  * **Ambiente de Dev/Staging:** O merge e o deploy são **100% automáticos**. Não há necessidade de autorização prévia, pois esse ambiente existe justamente para testes integrados.
  * **Ambiente de Produção:** Requer **aprovação humana obrigatória (*Human-in-the-Loop*)**. O agente prepara o Pull Request para a branch principal (`main`/`prod`) e as notas de versão, mas aguarda o aval explícito do usuário para disparar o deploy.
* **Teste de Fumaça (*Smoke Testing*):**
  * Subir o código ou contêiner não encerra o trabalho. O agente deve realizar uma chamada HTTP no endpoint de saúde (`/health` ou rota equivalente) para confirmar que a aplicação inicializou sem erros.
* **Preservação de Documentação Viva:**
  * Os arquivos `specs/[slug].md` e `tasks/[slug].json` aprovados são mantidos no repositório como histórico imutável da entrega no Git.

---

## Procedimento de Execução

### Fase 1: Verificação de Prontidão
1. Ler o arquivo `tasks/[slug].json`.
2. Validar que todas as tarefas possuem `status: "approved"`.
3. Se alguma tarefa não estiver aprovada, interromper a execução e listar os impedimentos.

### Fase 2: Entrega em Ambiente de Desenvolvimento (`dev`)
1. **Mesclagem de Branch:** Mesclar a branch da funcionalidade (ex.: `feat/[slug]`) na branch de desenvolvimento (`dev` ou `staging`).
2. **Atualização do `CHANGELOG.md`:** Ler as regras e proposta de valor em `specs/[slug].md` e adicionar uma entrada no arquivo de notas de versão da aplicação.
3. **Disparo do Deploy de Dev:** Acionar o comando de deploy correspondente (via Git push, pipeline de CI/CD ou comandos Docker do projeto).
4. **Verificação de Saúde:** Executar o teste de fumaça contra a URL de desenvolvimento para validar que o serviço respondeu com status 200.

### Fase 3: Preparação para Produção (Ponto de Controle Humano)
1. Abrir o Pull Request da branch de `dev` para a branch principal (`main` ou `prod`).
2. Anexar o resumo executivo das funcionalidades prontas no corpo do PR.
3. Notificar o usuário com a mensagem de confirmação:
   > *"A funcionalidade [slug] foi testada e publicada em desenvolvimento com sucesso. O pacote de release está preparado para produção. Deseja autorizar a publicação?"*
4. **Apenas após a confirmação do usuário:** Realizar o merge final e disparar o deploy em produção.

---

## Padrão de Atualização do `CHANGELOG.md`

As notas de versão geradas pelo agente devem seguir o formato Keep a Changelog:

```markdown
## [Versão ou Data] - [slug-da-funcionalidade]

### Adicionado
- [Descrição amigável da funcionalidade baseada na História de Usuário de specs/]
- [RN-01] [Resumo das regras implementadas e novos endpoints]

### Corrigido / Alterado
- [Ajustes de comportamento ou melhorias técnicas de tasks/]
```
