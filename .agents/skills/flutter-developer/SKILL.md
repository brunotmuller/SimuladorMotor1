---
name: flutter-developer
description: Guia e executa o desenvolvimento em Flutter e Dart, aplicando arquitetura Feature-First/Clean, boas práticas de performance, gerenciamento de estado e padrões de testes.
---

# Flutter Developer Skill

Esta skill guia o agente no papel de engenheiro de software especialista em Flutter e Dart, responsável por implementar funcionalidades em `lib/` e testes em `test/`, atendendo às tarefas planejadas em `tasks/[slug].json` e respeitando os contratos funcionais de `specs/[slug].md`.

---

## Diretrizes Fundamentais

* **Arquitetura Feature-First (Modular por Domínio):**
  * Organize o código por funcionalidade dentro de `lib/features/[feature_name]/`:
    * `data/`: Modelos com serialização JSON, Data Sources (local/remoto) e implementações de repositórios.
    * `domain/`: Entidades de negócio e interfaces/contratos de repositórios (quando aplicável).
    * `presentation/`: Gerenciadores de estado (controllers/notifiers/blocs), telas (`pages/`) e widgets específicos (`widgets/`).
  * Recursos transversais e compartilhados residem em `lib/core/` (ex.: tema, design tokens, utilitários, tratamento de erros, cliente HTTP/banco local).

* **Documentação Estritamente em Inglês:**
  * Todas as docstrings de classes, métodos, propriedades (`///`) e comentários de código (`//`) devem ser escritos exclusivamente em inglês.

* **Performance e Boas Práticas de Widgets:**
  * Utilize construtores `const` em todos os widgets imutáveis para evitar reconstruções desnecessárias.
  * Decomponha árvores de widgets profundas em widgets privados ou widgets dedicados menores em vez de grandes métodos de build monolíticos ou métodos que retornam `Widget`.
  * Nunca execute operações assíncronas bloqueantes dentro do método `build()`.
  * Garanta descarte adequado de controladores (`TextEditingController`, `AnimationController`, `ScrollController`, `StreamSubscription`) no método `dispose()`.

* **Conformidade Estática e Qualidade:**
  * O código deve passar 100% no `flutter analyze` sem erros ou advertências (`No issues found!`).
  * Siga as diretrizes de linting do `analysis_options.yaml` (conjunto `flutter_lints`).

* **Estratégia de Testes Idiomáticos:**
  * Todo código de regras de negócio, formatação e repositórios deve ter testes unitários correspondentes em `test/features/[feature_name]/...`.
  * Utilize `testWidgets` para validar comportamento de componentes visuais e estados de tela (loading, erro, exibição de dados).

---

## Procedimento de Execução de Tarefa

1. **Leitura da Tarefa:**
   * Ler a tarefa ativa em `tasks/[slug].json` e identificar a camada (`data_model`, `service`, `ui`, `test`, etc.).
2. **Implementação da Lógica/Dados:**
   * Implementar classes de dados, mapeamentos e serviços necessários, garantindo imutabilidade e tratamento de erros.
3. **Implementação da UI/Apresentação:**
   * Criar os widgets e telas utilizando Material 3, com suporte a estados de carregamento, vazio, erro e sucesso.
4. **Validação Estática e Testes:**
   * Executar `flutter analyze` no terminal para garantir conformidade estática.
   * Executar `flutter test` para validar que nenhum teste existente foi quebrado e que os novos testes passaram.
5. **Atualização da Tarefa:**
   * Notificar o `spec-verifier` para validação e auditoria da entrega.
