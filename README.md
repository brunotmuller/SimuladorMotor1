# Torque Lab

**Simulador veicular educacional** — consulte o valor FIPE, analise o estado do veículo e estime consumo e custos de viagem.

**Site:** [https://brunotmuller.github.io/SimuladorMotor1/](https://brunotmuller.github.io/SimuladorMotor1/)

---

## O que é

O Torque Lab ajuda estudantes e motoristas a entenderem melhor um veículo em poucos passos:

1. **Escolha o carro** — marca, modelo e ano (Tabela FIPE) ou consulta por placa  
2. **Informe como ele está** — km, peso, calibragem, pneus, uso e revisão  
3. **Veja o resultado** — nota estimada, consumo, alertas e calculadora de viagem  

Os resultados de consumo, saúde e nota são **estimativas educacionais**. Não substituem avaliação mecânica profissional. O valor FIPE vem de base externa oficial.

---

## Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| Consulta FIPE | Marcas, modelos, anos e preço de mercado |
| Análise veicular | Nota, consumo estimado, saúde e pontos de atenção |
| Consulta por placa | Dados do veículo via backend + Falcon Data Hub |
| Calculadora de viagem | Estimativa de custo a partir do consumo |
| Histórico local | Salva análises no dispositivo (AsyncStorage) |

---

## Tecnologias

- **Frontend:** Expo · React Native Web · TypeScript · Expo Router  
- **APIs:** Tabela FIPE (pública) · Falcon Data Hub (placa, via backend)  
- **Backend:** Node.js (`server/`) — protege o token da API de placa  
- **Deploy:** GitHub Pages (`gh-pages` + export estático)

---

## Como rodar localmente

```bash
npm install
npx expo start
# ou só a versão web:
npm run web
```

### Consulta por placa (opcional)

A versão web é estática; o token da Falcon fica só no backend Node.

1. Copie `.env.example` para `.env` e preencha `FALCON_API_TOKEN`  
2. Terminal 1: `npm run api` (Node 20.19+)  
3. Terminal 2: `npm run web` — o app chama `http://localhost:3001/api/vehicles`  

Para produção: hospede o backend em HTTPS, configure `ALLOWED_ORIGINS` e defina `EXPO_PUBLIC_PLATE_API_URL` (terminando em `/api/vehicles`) **antes** do build web.

Sem token válido, a consulta por placa avisa que o servidor não está configurado. O restante do simulador continua normal.

---

## Build e publicação

```bash
npm run build    # expo export --platform web → pasta dist/
npm run deploy   # publica em GitHub Pages
```

`app.json` usa `baseUrl: "/SimuladorMotor1"` para o caminho do Pages.

---

## Estrutura principal

```
app/
  (tabs)/          # tela principal, serviços FIPE, análise, estilos
  components/      # Header, PlateLookup, ResultCard, formulários, etc.
server/            # API Node da consulta por placa
assets/images/     # logo e ícones
```

---

## Aviso educacional

Este projeto foi desenvolvido no curso de **Desenvolvimento de Sistemas** (Escola Manoel Ignácio da Silva) com foco em consumo de APIs, UX e análise de dados veiculares. Use apenas como ferramenta de aprendizado e estimativa.

---

## Licença / uso

Projeto educacional. FIPE e Falcon são serviços de terceiros; respeite os termos de cada API.
