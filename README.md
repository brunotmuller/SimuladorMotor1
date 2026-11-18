# Torque Lab

**Simulador veicular educacional** — consulte o valor FIPE, analise o estado do veículo e estime consumo e custos de viagem.

**Site:** [https://brunotmuller.github.io/SimuladorMotor1/](https://brunotmuller.github.io/SimuladorMotor1/)

---

## O que é

O Torque Lab ajuda estudantes e motoristas a entenderem melhor um veículo em poucos passos:

1. **Escolha o carro** — marca, modelo e ano (Tabela FIPE)
2. **Informe como ele está** — km, peso, calibragem, pneus, uso e revisão
3. **Veja o resultado** — nota estimada, consumo, alertas e calculadora de viagem

Os resultados de consumo, saúde e nota são **estimativas educacionais**. Não substituem avaliação mecânica profissional. O valor FIPE vem de base externa.

---

## Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| Consulta FIPE | Marcas, modelos, anos e preço de mercado |
| Análise veicular | Nota, consumo estimado, saúde e pontos de atenção |
| Calculadora de viagem | Estimativa de custo a partir do consumo |
| Histórico local | Salva análises no dispositivo (AsyncStorage) |

---

## Tecnologias

- **Frontend:** Expo · React Native Web · TypeScript · Expo Router
- **API:** Tabela FIPE (Parallelum / API pública)
- **Deploy:** GitHub Pages (`gh-pages` + export estático)

---

## Como rodar localmente

```bash
npm install
npx expo start
# ou só a versão web:
npm run web
```

Requisitos: Node.js 20+ recomendado.

---

## Build e publicação

```bash
npm run build    # expo export --platform web → pasta dist/
npm run deploy   # publica em GitHub Pages
```

O `app.json` usa `baseUrl: "/SimuladorMotor1"` para o caminho do GitHub Pages.

---

## Estrutura principal

```
app/
  (tabs)/          # tela principal, serviços FIPE, análise, estilos
  components/      # Header, ResultCard, formulários, etc.
assets/images/     # logo e ícones
```

---

## Aviso educacional

Projeto desenvolvido no curso de **Desenvolvimento de Sistemas** (Escola Manoel Ignácio da Silva), com foco em consumo de APIs, UX e análise de dados veiculares. Use apenas como ferramenta de aprendizado e estimativa.

---

## Licença / uso

Projeto educacional. A Tabela FIPE é serviço de terceiros; respeite os termos de uso da API.
