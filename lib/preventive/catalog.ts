import {
  DemoVehicleTemplate,
  MaintenanceDefinition,
  MonthlyUsageOption,
} from "./types";

/**
 * Dados demonstrativos e conteúdo educativo separados da lógica de cálculo.
 * Nenhum intervalo abaixo substitui o manual oficial do fabricante.
 */

export const MONTHLY_USAGE_OPTIONS: MonthlyUsageOption[] = [
  {
    id: "pouco",
    label: "Pouco",
    rangeLabel: "Até 500 km/mês",
    estimatedMonthlyKm: 400,
    description: "Trajetos curtos no bairro ou carro usado poucas vezes na semana.",
  },
  {
    id: "normal",
    label: "Normal",
    rangeLabel: "Até 1.000 km/mês",
    estimatedMonthlyKm: 850,
    description: "Uso urbano diário equilibrado para trabalho e compromissos.",
  },
  {
    id: "frequente",
    label: "Frequente",
    rangeLabel: "Até 2.000 km/mês",
    estimatedMonthlyKm: 1500,
    description: "Deslocamentos longos diários ou viagens frequentes nos fins de semana.",
  },
  {
    id: "intenso",
    label: "Intenso",
    rangeLabel: "Acima de 2.000 km/mês",
    estimatedMonthlyKm: 2500,
    description: "Motoristas de aplicativo, estrada constante ou rotina comercial intensa.",
  },
];

export const MAINTENANCE_CATALOG: MaintenanceDefinition[] = [
  {
    id: "tire_pressure",
    name: "Calibragem dos pneus",
    shortName: "Calibragem",
    iconName: "speedometer-outline",
    defaultIntervalKm: null,
    defaultIntervalDays: 15,
    defaultIntervalMonths: null,
    intervalSummary: "A cada 15 dias",
    isDemoReference: true,
    guide: {
      whatIsIt:
        "É colocar a quantidade certa de ar nos pneus (incluindo o estepe). Pneu na pressão correta faz o carro gastar menos combustível, frear melhor e evita desgaste torto da borracha.",
      whereToResolve: [
        "Posto de gasolina (calibrador gratuito ou de autoatendimento)",
        "Borracharia ou centro automotivo",
        "Especialista em pneus",
      ],
      avoidScams: [
        "Não precisa pagar por 'nitrogênio' ou aditivos milagrosos para uso comum — ar comprimido normal resolve perfeitamente.",
        "Sempre calibre com os pneus frios (antes de rodar mais de 3 km) para a leitura ficar fiel.",
        "Confira o valor em PSI na etiqueta da porta do motorista ou na tampa do tanque antes de calibrar.",
        "Lembre de calibrar o estepe pelo menos uma vez por mês.",
      ],
      whenToWorry: [
        "Se um mesmo pneu murchar toda semana, pode haver um pequeno furo ou vazamento na válvula.",
        "Se a direção ficar pesada ou puxando para um lado mesmo após calibrar.",
        "Se notar bolhas na lateral ou desgaste forte só nas bordas do pneu.",
      ],
    },
  },
  {
    id: "engine_oil",
    name: "Óleo do motor e filtro de óleo",
    shortName: "Óleo e filtro",
    iconName: "water-outline",
    defaultIntervalKm: 10000,
    defaultIntervalDays: null,
    defaultIntervalMonths: 12,
    intervalSummary: "A cada 10.000 km ou 12 meses",
    isDemoReference: true,
    guide: {
      whatIsIt:
        "O óleo lubrifica todas as peças de metal que giram dentro do motor para elas não raspem e aqueçam demais. O filtro segura a sujeira desse óleo. Com o tempo ou uso, o óleo perde proteção — mesmo se o carro rodar pouco.",
      whereToResolve: [
        "Oficina mecânica de confiança",
        "Centro automotivo especializado em troca de óleo",
        "Concessionária da marca",
      ],
      avoidScams: [
        "Peça sempre o óleo com a especificação exata do manual (ex.: 5W30 sintético) — não aceite 'óleo parecido mais barato'.",
        "Sempre troque o filtro de óleo junto com o óleo; economizar no filtro contamina o óleo novo.",
        "Recuse 'limpeza interna do motor (flush)' ou aditivos extras se o carro não tem histórico de borra.",
        "Peça para ver os frascos lacrados e guarde a etiqueta de próxima troca com data e KM.",
      ],
      whenToWorry: [
        "Luz vermelha da almotolia (óleo) acesa no painel: pare o carro em local seguro assim que possível.",
        "Manchas escuras de óleo no chão onde o carro fica estacionado.",
        "Ruído metálico diferente ao ligar o motor frio pela manhã.",
      ],
    },
  },
  {
    id: "engine_air_filter",
    name: "Filtro de ar do motor",
    shortName: "Filtro de ar",
    iconName: "leaf-outline",
    defaultIntervalKm: 15000,
    defaultIntervalDays: null,
    defaultIntervalMonths: null,
    intervalSummary: "A cada 15.000 km",
    isDemoReference: true,
    guide: {
      whatIsIt:
        "Funciona como o 'pulmão' do carro: filtra poeira e sujeira antes do ar entrar no motor para queimar o combustível. Quando fica entupido, o motor faz mais esforço e gasta mais gasolina ou etanol.",
      whereToResolve: [
        "Oficina mecânica",
        "Centro automotivo (pode ser feito junto da troca de óleo)",
        "Autopeças com instalação rápida",
      ],
      avoidScams: [
        "Peça para ver o filtro antigo fora da caixa antes de aprovar a troca — um filtro limpo ainda tem cor clara e não precisa ser trocado antes da hora.",
        "Não aceite 'bater ar comprimido' em filtro muito sujo como substituição definitiva; o filtro novo costuma ser barato e protege bem melhor.",
        "Confirme se a caixa do filtro foi fechada e travada corretamente após a troca.",
      ],
      whenToWorry: [
        "Carro demorando mais para responder nas arrancadas ou subidas.",
        "Aumento perceptível no consumo de combustível sem mudança na sua rotina.",
        "Se você roda com frequência em estradas de terra ou áreas com muita poeira, vale inspecionar antes dos 15.000 km.",
      ],
    },
  },
  {
    id: "cabin_filter",
    name: "Filtro do ar-condicionado",
    shortName: "Filtro de cabine",
    iconName: "snow-outline",
    defaultIntervalKm: 15000,
    defaultIntervalDays: null,
    defaultIntervalMonths: null,
    intervalSummary: "A cada 15.000 km",
    isDemoReference: true,
    guide: {
      whatIsIt:
        "É o filtro de cabine que limpa o ar que entra para dentro do carro onde você e sua família respiram. Ele retém poeira, fumaça, pólen e reduz mau cheiro quando o ar-condicionado está ligado.",
      whereToResolve: [
        "Centro automotivo",
        "Oficina especializada em ar-condicionado automotivo",
        "Oficina mecânica",
      ],
      avoidScams: [
        "A troca do filtro de cabine é simples e rápida — desconfie se tentarem empurrar 'recarga de gás' automaticamente junto, pois o gás do ar-condicionado não vence por tempo.",
        "Higienização com spray só faz sentido se houver cheiro ruim persistente; se o ar está sem cheiro, trocar apenas o filtro já basta.",
        "Peça para ver o filtro retirado e confira a caixa lacrada do filtro novo.",
      ],
      whenToWorry: [
        "Cheiro de mofo ou poeira forte ao ligar a ventilação.",
        "Fluxo de vento fraco nas saídas mesmo na velocidade alta.",
        "Vidros demorando muito para desembaçar em dias de chuva.",
      ],
    },
  },
  {
    id: "alignment_balancing",
    name: "Alinhamento e balanceamento",
    shortName: "Alinhamento",
    iconName: "git-compare-outline",
    defaultIntervalKm: 10000,
    defaultIntervalDays: null,
    defaultIntervalMonths: null,
    intervalSummary: "A cada 10.000 km",
    isDemoReference: true,
    guide: {
      whatIsIt:
        "Alinhamento deixa as rodas apontando perfeitamente retas; balanceamento distribui o peso das rodas para não tremerem em velocidade. Juntos, deixam o carro mais seguro, confortável e aumentam muito a vida dos pneus.",
      whereToResolve: [
        "Especialista em pneus (autocenter)",
        "Centro automotivo com rampa de alinhamento",
      ],
      avoidScams: [
        "Desconfie da famosa 'cambagem urgente' oferecida junto com alinhamento promocional — muitos carros nem têm regulagem de cambagem de fábrica.",
        "Peça o relatório impresso ou na tela com os ângulos 'antes' e 'depois' do serviço.",
        "Se falarem que precisa trocar várias peças da suspensão, peça para ver a folga pessoalmente e, na dúvida, busque uma segunda opinião.",
      ],
      whenToWorry: [
        "Volante tremendo ao passar de 80 km/h em pista lisa.",
        "Carro puxando sozinho para a esquerda ou direita em linha reta.",
        "Depois de cair em um buraco forte ou bater o pneu no meio-fio.",
      ],
    },
  },
  {
    id: "brake_pads",
    name: "Pastilhas de freio",
    shortName: "Freios",
    iconName: "disc-outline",
    defaultIntervalKm: 20000,
    defaultIntervalDays: null,
    defaultIntervalMonths: null,
    intervalSummary: "Revisão a cada 20.000 km",
    isDemoReference: true,
    guide: {
      whatIsIt:
        "São as peças que encostam no disco da roda toda vez que você pisa no pedal de freio para parar o carro. Elas se desgastam naturalmente e precisam ser revisadas para nunca chegarem no metal.",
      whereToResolve: [
        "Oficina mecânica",
        "Centro automotivo",
        "Especialista em freios e suspensão",
      ],
      avoidScams: [
        "Revisão a cada 20.000 km significa inspecionar a espessura — só troque se realmente estiverem finas (perto de 3 mm ou menos).",
        "Nem sempre é obrigatório trocar os discos de freio junto com as pastilhas; pergunte qual a espessura atual do disco antes de autorizar.",
        "Peça para ver as pastilhas retiradas e exija peças de marca reconhecida e nota fiscal.",
      ],
      whenToWorry: [
        "Chiado agudo ou barulho de metal raspando ao frear.",
        "Pedal de freio ficando muito baixo, esponjoso ou exigindo mais força que o normal.",
        "Volante vibrando no momento da frenagem.",
      ],
    },
  },
];

/**
 * 10 modelos populares brasileiros para demonstração.
 * Os deslocamentos de manutenção (kmAgo / daysAgo) são exclusivamente demonstrativos
 * para ilustrar os estados Verde, Amarelo e Vermelho logo na experiência inicial.
 * Pressões de pneu NÃO são inventadas como recomendação oficial — o usuário é
 * orientado a conferir a etiqueta do veículo e pode salvar o valor oficial do seu carro.
 */
export const DEMO_VEHICLES: DemoVehicleTemplate[] = [
  {
    id: "demo-onix",
    brand: "Chevrolet",
    model: "Onix",
    year: 2022,
    version: "1.0 Turbo LTZ Automático",
    suggestedKm: 42800,
    suggestedUsage: "normal",
    categoryLabel: "Hatch compacto",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 350, daysAgo: 17 }, // Vermelho (passou de 15 dias)
      engine_oil: { kmAgo: 8600, daysAgo: 265 }, // Amarelo (próximo de 10.000 km)
      engine_air_filter: { kmAgo: 8600, daysAgo: 265 }, // Verde
      cabin_filter: { kmAgo: 12900, daysAgo: 320 }, // Amarelo (próximo de 15.000 km)
      alignment_balancing: { kmAgo: 4200, daysAgo: 130 }, // Verde
      brake_pads: { kmAgo: 10800, daysAgo: 310 }, // Verde
    },
  },
  {
    id: "demo-hb20",
    brand: "Hyundai",
    model: "HB20",
    year: 2023,
    version: "1.0 Comfort Plus Flex",
    suggestedKm: 31400,
    suggestedUsage: "normal",
    categoryLabel: "Hatch compacto",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 180, daysAgo: 8 },
      engine_oil: { kmAgo: 10400, daysAgo: 290 }, // Vermelho por km
      engine_air_filter: { kmAgo: 10400, daysAgo: 290 },
      cabin_filter: { kmAgo: 10400, daysAgo: 290 },
      alignment_balancing: { kmAgo: 8400, daysAgo: 240 }, // Amarelo
      brake_pads: { kmAgo: 11400, daysAgo: 310 },
    },
  },
  {
    id: "demo-corolla",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    version: "2.0 XEi Flex Direct Shift",
    suggestedKm: 58200,
    suggestedUsage: "frequente",
    categoryLabel: "Sedã médio",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 620, daysAgo: 13 }, // Amarelo (faltam 2 dias)
      engine_oil: { kmAgo: 6200, daysAgo: 380 }, // Vermelho por tempo (> 12 meses)
      engine_air_filter: { kmAgo: 6200, daysAgo: 150 },
      cabin_filter: { kmAgo: 14100, daysAgo: 290 }, // Amarelo
      alignment_balancing: { kmAgo: 4100, daysAgo: 95 },
      brake_pads: { kmAgo: 18200, daysAgo: 340 }, // Amarelo
    },
  },
  {
    id: "demo-gol",
    brand: "Volkswagen",
    model: "Gol",
    year: 2020,
    version: "1.6 MSI Flex",
    suggestedKm: 74500,
    suggestedUsage: "normal",
    categoryLabel: "Hatch compacto",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 400, daysAgo: 19 },
      engine_oil: { kmAgo: 9200, daysAgo: 300 },
      engine_air_filter: { kmAgo: 15600, daysAgo: 410 },
      cabin_filter: { kmAgo: 14500, daysAgo: 390 },
      alignment_balancing: { kmAgo: 10500, daysAgo: 320 },
      brake_pads: { kmAgo: 14500, daysAgo: 380 },
    },
  },
  {
    id: "demo-argo",
    brand: "Fiat",
    model: "Argo",
    year: 2022,
    version: "1.0 Drive Firefly",
    suggestedKm: 36900,
    suggestedUsage: "pouco",
    categoryLabel: "Hatch compacto",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 120, daysAgo: 10 },
      engine_oil: { kmAgo: 4800, daysAgo: 340 }, // Amarelo por tempo
      engine_air_filter: { kmAgo: 6900, daysAgo: 340 },
      cabin_filter: { kmAgo: 6900, daysAgo: 340 },
      alignment_balancing: { kmAgo: 4800, daysAgo: 240 },
      brake_pads: { kmAgo: 16900, daysAgo: 540 }, // Amarelo por km
    },
  },
  {
    id: "demo-polo",
    brand: "Volkswagen",
    model: "Polo",
    year: 2023,
    version: "1.0 TSI Highline",
    suggestedKm: 28600,
    suggestedUsage: "frequente",
    categoryLabel: "Hatch compacto",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 310, daysAgo: 6 },
      engine_oil: { kmAgo: 8600, daysAgo: 180 },
      engine_air_filter: { kmAgo: 8600, daysAgo: 180 },
      cabin_filter: { kmAgo: 13600, daysAgo: 280 },
      alignment_balancing: { kmAgo: 8600, daysAgo: 180 },
      brake_pads: { kmAgo: 8600, daysAgo: 180 },
    },
  },
  {
    id: "demo-compass",
    brand: "Jeep",
    model: "Compass",
    year: 2022,
    version: "1.3 T270 Longitude Flex",
    suggestedKm: 51200,
    suggestedUsage: "frequente",
    categoryLabel: "SUV médio",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 700, daysAgo: 16 },
      engine_oil: { kmAgo: 9100, daysAgo: 210 },
      engine_air_filter: { kmAgo: 11200, daysAgo: 260 },
      cabin_filter: { kmAgo: 15200, daysAgo: 330 },
      alignment_balancing: { kmAgo: 5200, daysAgo: 120 },
      brake_pads: { kmAgo: 21200, daysAgo: 420 },
    },
  },
  {
    id: "demo-creta",
    brand: "Hyundai",
    model: "Creta",
    year: 2023,
    version: "1.0 TGDI Comfort",
    suggestedKm: 24900,
    suggestedUsage: "normal",
    categoryLabel: "SUV compacto",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 220, daysAgo: 12 },
      engine_oil: { kmAgo: 4900, daysAgo: 170 },
      engine_air_filter: { kmAgo: 9900, daysAgo: 320 },
      cabin_filter: { kmAgo: 9900, daysAgo: 320 },
      alignment_balancing: { kmAgo: 4900, daysAgo: 170 },
      brake_pads: { kmAgo: 4900, daysAgo: 170 },
    },
  },
  {
    id: "demo-hrv",
    brand: "Honda",
    model: "HR-V",
    year: 2022,
    version: "1.5 DI i-VTEC EXL",
    suggestedKm: 46300,
    suggestedUsage: "normal",
    categoryLabel: "SUV compacto",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 260, daysAgo: 9 },
      engine_oil: { kmAgo: 6300, daysAgo: 215 },
      engine_air_filter: { kmAgo: 16300, daysAgo: 420 },
      cabin_filter: { kmAgo: 13200, daysAgo: 330 },
      alignment_balancing: { kmAgo: 6300, daysAgo: 215 },
      brake_pads: { kmAgo: 16300, daysAgo: 420 },
    },
  },
  {
    id: "demo-strada",
    brand: "Fiat",
    model: "Strada",
    year: 2023,
    version: "1.3 Firefly Freedom Cabine Plus",
    suggestedKm: 63400,
    suggestedUsage: "intenso",
    categoryLabel: "Picape compacta",
    demoMaintenanceOffsets: {
      tire_pressure: { kmAgo: 1100, daysAgo: 14 },
      engine_oil: { kmAgo: 10900, daysAgo: 145 },
      engine_air_filter: { kmAgo: 13400, daysAgo: 185 },
      cabin_filter: { kmAgo: 13400, daysAgo: 185 },
      alignment_balancing: { kmAgo: 8900, daysAgo: 120 },
      brake_pads: { kmAgo: 18400, daysAgo: 250 },
    },
  },
];

export function getMonthlyUsageOption(id: string): MonthlyUsageOption {
  return (
    MONTHLY_USAGE_OPTIONS.find((item) => item.id === id) ??
    MONTHLY_USAGE_OPTIONS[1]
  );
}
