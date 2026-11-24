import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AboutSection from "../components/AboutSection";
import CarGuide, { ExemploVeiculo } from "../components/CarGuide";
import Header from "../components/Header";
import MaintenanceAdvisor from "../components/MaintenanceAdvisor";
import ProgressSteps from "../components/ProgressSteps";
import QuickExamples from "../components/QuickExamples";
import ResultCard from "../components/ResultCard";
import SavedAnalyses from "../components/SavedAnalyses";
import SeletorModal from "../components/SeletorModal";
import TripCalculator from "../components/TripCalculator";
import VehicleForm from "../components/VehicleForm";
import VehicleHub from "../components/VehicleHub";
import VehicleSelector from "../components/VehicleSelector";

import {
  buscarAnos,
  buscarDadosFipe,
  buscarMarcas,
  buscarModelos,
} from "./services/fipeApi";
import { carregarAnalises, gravarAnalises } from "./services/savedAnalyses";

import { AnaliseSalva } from "./types/savedAnalysis";
import {
  CondicaoPneu,
  DadosAtuais,
  DadosFipe,
  ItemAPI,
  Resultado,
  TipoPneu,
  TipoUso,
} from "./types/vehicle";

import { styles } from "./styles/styles";
import { analisarVeiculo } from "./utils/analyzer";
import { validarDados } from "./utils/validators";

const webAttr = (attrs: Record<string, string>) =>
  Platform.OS === "web" ? (attrs as object) : {};

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const entrada = useRef(new Animated.Value(0)).current;

  const [marcas, setMarcas] = useState<ItemAPI[]>([]);
  const [modelos, setModelos] = useState<ItemAPI[]>([]);
  const [anos, setAnos] = useState<ItemAPI[]>([]);

  const [marca, setMarca] = useState<ItemAPI | null>(null);
  const [modelo, setModelo] = useState<ItemAPI | null>(null);
  const [ano, setAno] = useState<ItemAPI | null>(null);

  const [dadosFipe, setDadosFipe] = useState<DadosFipe | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [modoDemonstracao, setModoDemonstracao] = useState(false);
  const [exemploAtivoId, setExemploAtivoId] = useState<string | null>(null);
  const [dadosAnalisados, setDadosAnalisados] = useState<DadosAtuais | null>(
    null
  );
  const [analisesSalvas, setAnalisesSalvas] = useState<AnaliseSalva[]>([]);
  const [avisoSalvamento, setAvisoSalvamento] = useState("");
  const [analiseSalvaId, setAnaliseSalvaId] = useState<string | null>(null);

  const [km, setKm] = useState("");
  const [peso, setPeso] = useState("");
  const [calibragem, setCalibragem] = useState("");
  const [mesesUltimaRevisao, setMesesUltimaRevisao] = useState("");
  const [tipoPneu, setTipoPneu] = useState<TipoPneu | null>(null);
  const [tipoUso, setTipoUso] = useState<TipoUso | null>(null);
  const [condicaoPneu, setCondicaoPneu] = useState<CondicaoPneu | null>(null);

  const [mensagem, setMensagem] = useState("");
  const [carregandoMarcas, setCarregandoMarcas] = useState(false);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const [carregandoAnos, setCarregandoAnos] = useState(false);
  const [carregandoFipe, setCarregandoFipe] = useState(false);
  const [analisando, setAnalisando] = useState(false);

  const [modalMarca, setModalMarca] = useState(false);
  const [modalModelo, setModalModelo] = useState(false);
  const [modalAno, setModalAno] = useState(false);

  useEffect(() => {
    carregarMarcas();
    Animated.timing(entrada, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrada]);

  useEffect(() => {
    let ativo = true;
    carregarAnalises().then((analises) => {
      if (ativo) setAnalisesSalvas(analises);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const passo: 1 | 2 | 3 = resultado ? 3 : dadosFipe ? 2 : 1;

  function rolarParaResultado() {
    setTimeout(() => {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const el = document.querySelector("#result-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }

  async function carregarMarcas() {
    try {
      setMensagem("");
      setCarregandoMarcas(true);
      const dados = await buscarMarcas();
      setMarcas(dados);
    } catch (erro) {
      console.log(erro);
      setMensagem(
        "Sem conexão com a tabela FIPE no momento. Verifique a internet e toque em Tentar novamente."
      );
    } finally {
      setCarregandoMarcas(false);
    }
  }

  async function selecionarMarca(item: ItemAPI) {
    setModoDemonstracao(false);
    setExemploAtivoId(null);
    setMarca(item);
    setModelo(null);
    setAno(null);
    setDadosFipe(null);
    setResultado(null);
    setModelos([]);
    setAnos([]);

    try {
      setMensagem("");
      setCarregandoModelos(true);
      const dados = await buscarModelos(item.code);
      setModelos(dados);
    } catch {
      setMensagem(
        "Não foi possível carregar os modelos desta marca. Tente outra marca ou aguarde e tente de novo."
      );
    } finally {
      setCarregandoModelos(false);
    }
  }

  async function selecionarModelo(item: ItemAPI) {
    if (!marca) return;

    setModelo(item);
    setAno(null);
    setDadosFipe(null);
    setResultado(null);
    setAnos([]);

    try {
      setMensagem("");
      setCarregandoAnos(true);
      const dados = await buscarAnos(marca.code, item.code);
      setAnos(dados);
    } catch {
      setMensagem(
        "Não foi possível carregar os anos deste modelo. Tente novamente em instantes."
      );
    } finally {
      setCarregandoAnos(false);
    }
  }

  async function selecionarAno(item: ItemAPI) {
    if (!marca || !modelo) return;

    setAno(item);
    setDadosFipe(null);
    setResultado(null);

    try {
      setMensagem("");
      setCarregandoFipe(true);
      const dados = await buscarDadosFipe(marca.code, modelo.code, item.code);
      setDadosFipe(dados);
    } catch {
      setMensagem(
        "Não foi possível obter o valor FIPE deste veículo. Confira a seleção ou tente de novo."
      );
    } finally {
      setCarregandoFipe(false);
    }
  }

  function aplicarExemplo(exemplo: ExemploVeiculo) {
    setExemploAtivoId(exemplo.id);
    setKm(exemplo.km);
    setPeso(exemplo.peso);
    setCalibragem(exemplo.calibragem);
    setMesesUltimaRevisao(exemplo.mesesUltimaRevisao);
    setTipoPneu(exemplo.tipoPneu);
    setTipoUso(exemplo.tipoUso);
    setCondicaoPneu(exemplo.condicaoPneu);
    setMensagem("");
    setAvisoSalvamento(
      `Formulário preenchido com o exemplo “${exemplo.titulo}”. Ajuste os valores ou clique em Analisar veículo.`
    );
  }

  function analisar() {
    const ehDemo = dadosFipe?.codeFipe === "DEMONSTRACAO";
    setModoDemonstracao(ehDemo);

    const erro = validarDados({
      marca,
      modelo,
      ano,
      dadosFipe,
      km,
      peso,
      calibragem,
      tipoPneu: tipoPneu ?? "",
      tipoUso: tipoUso ?? "",
      condicaoPneu: condicaoPneu ?? "",
      mesesUltimaRevisao,
    });

    if (erro) {
      setMensagem(erro);
      return;
    }

    if (!dadosFipe || !tipoPneu || !tipoUso || !condicaoPneu) {
      return;
    }

    setMensagem("");
    setAnalisando(true);

    const dadosAtuais: DadosAtuais = {
      km: Number(km),
      peso: Number(peso),
      calibragem: Number(calibragem),
      pneu: tipoPneu,
      tipoUso,
      condicaoPneu,
      mesesUltimaRevisao: Number(mesesUltimaRevisao),
    };
    const novoResultado = analisarVeiculo(dadosFipe, dadosAtuais);

    setResultado(novoResultado);
    setDadosAnalisados(dadosAtuais);
    setAvisoSalvamento("");
    setAnaliseSalvaId(null);

    setTimeout(() => {
      setAnalisando(false);
      rolarParaResultado();
    }, 350);
  }

  function visualizarExemplo(exemplo: ExemploVeiculo) {
    const fipeExemplo: DadosFipe = {
      vehicleType: 1,
      price: "Valor ilustrativo — não consultado na FIPE",
      brand: exemplo.marca,
      model: exemplo.modelo,
      modelYear: exemplo.ano,
      fuel: exemplo.combustivel,
      codeFipe: "DEMONSTRACAO",
      referenceMonth: "Demonstração",
    };
    const dadosExemplo: DadosAtuais = {
      km: Number(exemplo.km),
      peso: Number(exemplo.peso),
      calibragem: Number(exemplo.calibragem),
      pneu: exemplo.tipoPneu,
      tipoUso: exemplo.tipoUso,
      condicaoPneu: exemplo.condicaoPneu,
      mesesUltimaRevisao: Number(exemplo.mesesUltimaRevisao),
    };
    setMarca({ code: `demo-${exemplo.id}`, name: exemplo.marca });
    setModelo({ code: `demo-model-${exemplo.id}`, name: exemplo.modelo });
    setAno({
      code: String(exemplo.ano),
      name: `${exemplo.ano} / ${exemplo.combustivel}`,
    });
    setDadosFipe(fipeExemplo);
    setDadosAnalisados(dadosExemplo);
    setKm(exemplo.km);
    setPeso(exemplo.peso);
    setCalibragem(exemplo.calibragem);
    setMesesUltimaRevisao(exemplo.mesesUltimaRevisao);
    setTipoPneu(exemplo.tipoPneu);
    setTipoUso(exemplo.tipoUso);
    setCondicaoPneu(exemplo.condicaoPneu);
    setResultado(analisarVeiculo(fipeExemplo, dadosExemplo));
    setModoDemonstracao(true);
    setExemploAtivoId(exemplo.id);
    setAnaliseSalvaId(null);
    setAvisoSalvamento(
      `Demonstração “${exemplo.marca} ${exemplo.modelo}”: dados ilustrativos aplicados.`
    );
    setMensagem("");
    rolarParaResultado();
  }

  function limpar() {
    setModoDemonstracao(false);
    setExemploAtivoId(null);
    setMarca(null);
    setModelo(null);
    setAno(null);
    setModelos([]);
    setAnos([]);
    setDadosFipe(null);
    setResultado(null);
    setDadosAnalisados(null);
    setAvisoSalvamento("");
    setAnaliseSalvaId(null);
    setKm("");
    setPeso("");
    setCalibragem("");
    setMesesUltimaRevisao("");
    setTipoPneu(null);
    setTipoUso(null);
    setCondicaoPneu(null);
    setMensagem("");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function salvarAnalise() {
    if (
      !resultado ||
      !dadosFipe ||
      !dadosAnalisados ||
      !marca ||
      !modelo ||
      !ano ||
      analiseSalvaId
    ) {
      return;
    }
    const nova: AnaliseSalva = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      salvaEm: new Date().toISOString(),
      nome: `${dadosFipe.brand} ${dadosFipe.model} · ${dadosFipe.modelYear}`,
      fipe: dadosFipe,
      dados: dadosAnalisados,
      resultado,
      selecao: { marca, modelo, ano },
    };
    const atualizadas = [nova, ...analisesSalvas];
    if (await gravarAnalises(atualizadas)) {
      setAnalisesSalvas(atualizadas);
      setAnaliseSalvaId(nova.id);
      setAvisoSalvamento("Análise salva neste dispositivo.");
    } else {
      setAvisoSalvamento("Não foi possível salvar neste dispositivo.");
    }
  }

  async function excluirAnalise(id: string) {
    const atualizadas = analisesSalvas.filter((item) => item.id !== id);
    if (await gravarAnalises(atualizadas)) {
      setAnalisesSalvas(atualizadas);
      if (analiseSalvaId === id) {
        setAnaliseSalvaId(null);
        setAvisoSalvamento("");
      }
    }
  }

  async function renomearAnalise(id: string, nome: string) {
    const atualizadas = analisesSalvas.map((item) =>
      item.id === id ? { ...item, nome } : item
    );
    if (await gravarAnalises(atualizadas)) {
      setAnalisesSalvas(atualizadas);
    }
  }

  function abrirAnalise(analise: AnaliseSalva) {
    setModoDemonstracao(false);
    setExemploAtivoId(null);
    setMarca(analise.selecao.marca);
    setModelo(analise.selecao.modelo);
    setAno(analise.selecao.ano);
    setDadosFipe(analise.fipe);
    setResultado(analise.resultado);
    setDadosAnalisados(analise.dados);
    setKm(String(analise.dados.km));
    setPeso(String(analise.dados.peso));
    setCalibragem(String(analise.dados.calibragem));
    setMesesUltimaRevisao(String(analise.dados.mesesUltimaRevisao));
    setTipoPneu(analise.dados.pneu);
    setTipoUso(analise.dados.tipoUso);
    setCondicaoPneu(analise.dados.condicaoPneu);
    setAvisoSalvamento("");
    setAnaliseSalvaId(analise.id);
    rolarParaResultado();
  }

  const entradaY = entrada.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: entrada,
            transform: [{ translateY: entradaY }],
          }}
        >
          <Header
            online={marcas.length > 0}
            carregando={carregandoMarcas}
          />

          <ProgressSteps passo={passo} />

          <QuickExamples
            exemploAtivoId={exemploAtivoId}
            onSimularExemplo={visualizarExemplo}
          />

          {mensagem !== "" && (
            <View style={styles.mensagemErro}>
              <Text style={styles.erroTitulo}>Atenção</Text>
              <Text style={styles.erroTexto}>{mensagem}</Text>
              {marcas.length === 0 && !carregandoMarcas && (
                <TouchableOpacity
                  style={styles.tentarNovamente}
                  onPress={carregarMarcas}
                >
                  <Text style={styles.tentarNovamenteTexto}>
                    Tentar novamente
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View nativeID="simulator-section" style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionEyebrow}>01 / SIMULADOR PRINCIPAL</Text>
            <Text style={styles.sectionHeading}>
              Configure e analise seu veículo
            </Text>
            <Text style={styles.sectionLead}>
              Escolha marca, modelo e ano pela Tabela FIPE, informe as condições
              atuais e gere o relatório completo.
            </Text>
          </View>

          <View
            style={styles.desktopColumns}
            {...webAttr({ "data-torque-columns": "1" })}
          >
            <View style={styles.desktopColumn}>
              <VehicleSelector
                marca={marca}
                modelo={modelo}
                ano={ano}
                dadosFipe={dadosFipe}
                carregandoMarcas={carregandoMarcas}
                carregandoModelos={carregandoModelos}
                carregandoAnos={carregandoAnos}
                carregandoFipe={carregandoFipe}
                marcasDisponiveis={marcas.length > 0}
                modelosDisponiveis={modelos.length > 0}
                anosDisponiveis={anos.length > 0}
                abrirMarca={() => setModalMarca(true)}
                abrirModelo={() => setModalModelo(true)}
                abrirAno={() => setModalAno(true)}
              />

              <CarGuide onUsarExemplo={aplicarExemplo} />
            </View>

            <View style={styles.desktopColumn}>
              <VehicleForm
                km={km}
                setKm={setKm}
                peso={peso}
                setPeso={setPeso}
                calibragem={calibragem}
                setCalibragem={setCalibragem}
                mesesUltimaRevisao={mesesUltimaRevisao}
                setMesesUltimaRevisao={setMesesUltimaRevisao}
                tipoPneu={tipoPneu}
                setTipoPneu={setTipoPneu}
                tipoUso={tipoUso}
                setTipoUso={setTipoUso}
                condicaoPneu={condicaoPneu}
                setCondicaoPneu={setCondicaoPneu}
              />

              {!!avisoSalvamento && !resultado && (
                <Text style={styles.textoAjuda}>{avisoSalvamento}</Text>
              )}

              <TouchableOpacity
                style={styles.botao}
                onPress={analisar}
                disabled={analisando}
                activeOpacity={0.85}
                accessibilityRole="button"
                {...webAttr({ "data-torque-cta": "1" })}
              >
                {analisando ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text
                      style={[styles.botaoTexto, styles.botaoTextoCarregando]}
                    >
                      Analisando...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.botaoTexto}>Analisar veículo</Text>
                    <Text style={styles.botaoSeta}>→</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {resultado && dadosFipe && dadosAnalisados && (
          <View nativeID="result-section">
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionEyebrow}>DIAGNÓSTICO GERADO</Text>
              <Text style={styles.sectionHeading}>
                Resultado e simulador de viagem
              </Text>
            </View>
            <View
              style={styles.desktopColumns}
              {...webAttr({ "data-torque-columns": "1" })}
            >
              <View style={styles.desktopColumn}>
                <ResultCard
                  resultado={resultado}
                  dadosFipe={dadosFipe}
                  dadosAtuais={dadosAnalisados}
                  salvar={salvarAnalise}
                  avisoSalvamento={avisoSalvamento}
                  salvo={!!analiseSalvaId}
                  modoDemonstracao={modoDemonstracao}
                  limpar={limpar}
                />
              </View>
              <View style={styles.desktopColumn}>
                <TripCalculator consumo={resultado.consumo} />
              </View>
            </View>
          </View>
        )}

        <SavedAnalyses
          analises={analisesSalvas}
          abrir={abrirAnalise}
          excluir={excluirAnalise}
          renomear={renomearAnalise}
        />

        <VehicleHub />

        <MaintenanceAdvisor
          marcas={marcas}
          carregandoMarcas={carregandoMarcas}
          veiculoAtual={
            marca && modelo && !modoDemonstracao ? { marca, modelo } : null
          }
        />

        <AboutSection />

        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/torquelab-logo.png")}
            style={styles.footerLogoImagem}
            resizeMode="contain"
            accessibilityLabel="TorqueLab"
          />
          <Text style={styles.footerTexto}>
            Simulador veicular educacional • {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>

      <SeletorModal
        visible={modalMarca}
        titulo="Selecionar marca"
        itens={marcas}
        carregando={carregandoMarcas}
        onClose={() => setModalMarca(false)}
        onSelect={selecionarMarca}
      />

      <SeletorModal
        visible={modalModelo}
        titulo="Selecionar modelo"
        itens={modelos}
        carregando={carregandoModelos}
        onClose={() => setModalModelo(false)}
        onSelect={selecionarModelo}
      />

      <SeletorModal
        visible={modalAno}
        titulo="Selecionar ano"
        itens={anos}
        carregando={carregandoAnos}
        onClose={() => setModalAno(false)}
        onSelect={selecionarAno}
      />
    </>
  );
}
