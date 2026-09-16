import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
  },

  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 40,
  },

  topo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 45,
  },

  logo: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  logoVermelho: {
    color: "#ef3340",
  },

  status: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusBolinha: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: "#43c977",
    marginRight: 7,
  },

  statusOffline: {
    backgroundColor: "#ef3340",
  },

  statusTexto: {
    color: "#777",
    fontSize: 12,
  },

  titulo: {
    color: "#fff",
    fontSize: 39,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: -1.6,
  },

  subtitulo: {
    color: "#777",
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 500,
    marginTop: 14,
    marginBottom: 32,
  },

  mensagemErro: {
    backgroundColor: "#1c1213",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
  },

  erroConteudo: {
    marginBottom: 4,
  },

  erroTitulo: {
    color: "#ef3340",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  erroTexto: {
    color: "#bbb",
    fontSize: 12,
    lineHeight: 19,
  },

  tentarNovamente: {
    alignSelf: "flex-start",
    backgroundColor: "#2a181a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },

  tentarNovamenteTexto: {
    color: "#ef3340",
    fontSize: 11,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  },

  tituloSecao: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 22,
  },

  label: {
    color: "#777",
    fontSize: 11,
    marginBottom: 7,
  },

  seletor: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: "#191919",
    paddingHorizontal: 15,
    marginBottom: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  seletorTexto: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    paddingRight: 8,
  },

  placeholder: {
    color: "#666",
  },

  desativado: {
    opacity: 0.4,
  },

  chevron: {
    color: "#666",
    fontSize: 25,
  },

  carregando: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  carregandoTexto: {
    color: "#777",
    fontSize: 12,
    marginLeft: 9,
  },

  fipe: {
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: 18,
    marginTop: 5,
  },

  fipeLabel: {
    color: "#666",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.8,
  },

  fipePreco: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "800",
    marginTop: 5,
  },

  fipeNome: {
    color: "#bbb",
    fontSize: 13,
    marginTop: 12,
  },

  fipeLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  fipeDetalhe: {
    color: "#777",
    fontSize: 12,
  },

  ponto: {
    color: "#444",
    marginHorizontal: 8,
  },

  codigoFipe: {
    color: "#555",
    fontSize: 10,
    marginTop: 10,
  },

  referenciaFipe: {
    color: "#555",
    fontSize: 10,
    marginTop: 3,
  },

  linha: {
    flexDirection: "row",
    width: "100%",
  },

  campoMetade: {
    flex: 1,
  },

  campoEsquerda: {
    marginRight: 10,
  },

  input: {
    height: 54,
    borderRadius: 12,
    backgroundColor: "#191919",
    paddingHorizontal: 14,
    color: "#fff",
    fontSize: 14,
    marginBottom: 17,
  },

  botao: {
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 20,
    backgroundColor: "#ef3340",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
    marginBottom: 35,
  },

  botaoIncompleto: {
    backgroundColor: "#bd2934",
  },

  botaoTexto: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  botaoTextoCarregando: {
    flex: 1,
    marginLeft: 10,
  },

  botaoSeta: {
    color: "#fff",
    fontSize: 23,
  },

  resultado: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 22,
    marginBottom: 30,
  },

  resultadoPequeno: {
    color: "#666",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 15,
  },

  resultadoTitulo: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },

  nomeCarro: {
    color: "#ddd",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 3,
  },

  infoCarro: {
    color: "#777",
    fontSize: 12,
    marginTop: 7,
  },

  valorFipe: {
    marginTop: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#222",
  },

  valorFipeLabel: {
    color: "#666",
    fontSize: 9,
    marginBottom: 5,
  },

  valorFipeNumero: {
    color: "#fff",
    fontSize: 29,
    fontWeight: "800",
  },

  notaArea: {
    marginTop: 24,
  },

  notaTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  notaLabel: {
    color: "#666",
    fontSize: 9,
  },

  nota: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    marginTop: 2,
  },

  notaDe: {
    color: "#555",
    fontSize: 13,
  },

  classificacaoBox: {
    backgroundColor: "#211315",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  classificacao: {
    color: "#ef3340",
    fontSize: 12,
    fontWeight: "700",
  },

  barraFundo: {
    height: 5,
    backgroundColor: "#252525",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
  },

  barra: {
    height: "100%",
    backgroundColor: "#ef3340",
  },

  metricas: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 22,
  },

  metrica: {
    width: "48.5%",
    backgroundColor: "#181818",
    borderRadius: 12,
    padding: 15,
  },

  metricaEsquerda: {
    marginRight: "3%",
  },

  metricaBaixo: {
    marginTop: 10,
  },

  metricaLabel: {
    color: "#666",
    fontSize: 10,
    marginBottom: 7,
  },

  metricaValor: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  alertas: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#1c1213",
  },

  alertasTitulo: {
    color: "#ef3340",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },

  alertaLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 5,
  },

  alertaBolinha: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#ef3340",
    marginTop: 7,
    marginRight: 8,
  },

  alertaTexto: {
    flex: 1,
    color: "#aaa",
    fontSize: 12,
    lineHeight: 19,
  },

  sustentabilidade: {
    backgroundColor: "#121a15",
    borderRadius: 12,
    padding: 15,
    marginTop: 18,
  },

  sustentabilidadeTitulo: {
    color: "#6fd090",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },

  sustentabilidadeTexto: {
    color: "#8a9b90",
    fontSize: 11,
    lineHeight: 18,
  },

  aviso: {
    color: "#555",
    textAlign: "center",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 20,
  },

  botaoSecundario: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#1b1b1b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  botaoSecundarioTexto: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  footer: {
    alignItems: "center",
    paddingVertical: 10,
  },

  footerLogo: {
    color: "#666",
    fontSize: 13,
    fontWeight: "700",
  },

  footerTexto: {
    color: "#444",
    fontSize: 9,
    marginTop: 5,
  },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "80%",
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  modalTitulo: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  fechar: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  fecharTexto: {
    color: "#777",
    fontSize: 27,
  },

  busca: {
    height: 50,
    backgroundColor: "#191919",
    borderRadius: 11,
    paddingHorizontal: 14,
    color: "#fff",
    marginBottom: 10,
  },

  lista: {
    flexGrow: 0,
  },

  itemLista: {
    minHeight: 53,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
    flexDirection: "row",
    alignItems: "center",
  },

  itemTexto: {
    color: "#ddd",
    flex: 1,
    fontSize: 14,
    paddingRight: 10,
  },

  setaLista: {
    color: "#555",
    fontSize: 22,
  },

  semResultado: {
    color: "#666",
    textAlign: "center",
    paddingVertical: 30,
  },

  modalCarregando: {
    paddingVertical: 35,
    alignItems: "center",
  },

  textoSecundario: {
    color: "#777",
    fontSize: 12,
    marginTop: 10,
  },

  // NOVOS ESTILOS

  opcoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 8,
  },

  opcao: {
    backgroundColor: "#191919",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#222",
  },

  opcaoAtiva: {
    backgroundColor: "#2a1517",
    borderColor: "#ef3340",
  },

  opcaoTexto: {
    color: "#777",
    fontSize: 12,
    fontWeight: "600",
  },

  opcaoTextoAtivo: {
    color: "#ef3340",
  },

  detalhesNota: {
    marginTop: 18,
    padding: 16,
    backgroundColor: "#181818",
    borderRadius: 12,
  },

  detalhesTitulo: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },

  detalheLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },

  detalheTexto: {
    color: "#999",
    fontSize: 11,
    flex: 1,
    paddingRight: 15,
  },

  detalhePontos: {
    color: "#ef3340",
    fontSize: 12,
    fontWeight: "700",
  },
});