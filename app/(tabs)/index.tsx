import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Header from "../components/Header";
import ResultCard from "../components/ResultCard";
import SeletorModal from "../components/SeletorModal";
import VehicleForm from "../components/VehicleForm";
import VehicleSelector from "../components/VehicleSelector";

import {
  buscarAnos,
  buscarDadosFipe,
  buscarMarcas,
  buscarModelos,
} from "./services/fipeApi";

import { analisarVeiculo } from "./utils/analyzer";
import { validarDados } from "./utils/validators";

import {
  CondicaoPneu,
  DadosFipe,
  ItemAPI,
  Resultado,
  TipoPneu,
  TipoUso,
} from "./types/vehicle";

import { styles } from "./styles/styles";

export default function HomeScreen() {
  const scrollRef =
    useRef<ScrollView>(null);

  const entrada =
    useRef(new Animated.Value(0)).current;

  const [marcas, setMarcas] =
    useState<ItemAPI[]>([]);

  const [modelos, setModelos] =
    useState<ItemAPI[]>([]);

  const [anos, setAnos] =
    useState<ItemAPI[]>([]);

  const [marca, setMarca] =
    useState<ItemAPI | null>(null);

  const [modelo, setModelo] =
    useState<ItemAPI | null>(null);

  const [ano, setAno] =
    useState<ItemAPI | null>(null);

  const [dadosFipe, setDadosFipe] =
    useState<DadosFipe | null>(null);

  const [resultado, setResultado] =
    useState<Resultado | null>(null);

  const [km, setKm] = useState("");
  const [peso, setPeso] = useState("");
  const [calibragem, setCalibragem] =
    useState("");

  const [
    mesesUltimaRevisao,
    setMesesUltimaRevisao,
  ] = useState("");

  const [tipoPneu, setTipoPneu] =
    useState<TipoPneu | null>(null);

  const [tipoUso, setTipoUso] =
    useState<TipoUso | null>(null);

  const [
    condicaoPneu,
    setCondicaoPneu,
  ] = useState<CondicaoPneu | null>(null);

  const [mensagem, setMensagem] =
    useState("");

  const [
    carregandoMarcas,
    setCarregandoMarcas,
  ] = useState(false);

  const [
    carregandoModelos,
    setCarregandoModelos,
  ] = useState(false);

  const [
    carregandoAnos,
    setCarregandoAnos,
  ] = useState(false);

  const [
    carregandoFipe,
    setCarregandoFipe,
  ] = useState(false);

  const [analisando, setAnalisando] =
    useState(false);

  const [modalMarca, setModalMarca] =
    useState(false);

  const [modalModelo, setModalModelo] =
    useState(false);

  const [modalAno, setModalAno] =
    useState(false);

  useEffect(() => {
    carregarMarcas();

    Animated.timing(entrada, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrada]);

  async function carregarMarcas() {
    try {
      setMensagem("");
      setCarregandoMarcas(true);

      const dados =
        await buscarMarcas();

      setMarcas(dados);
    } catch (erro) {
      console.log(erro);

      setMensagem(
        "Não foi possível conectar à FIPE. Verifique sua internet."
      );
    } finally {
      setCarregandoMarcas(false);
    }
  }

  async function selecionarMarca(
    item: ItemAPI
  ) {
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

      const dados =
        await buscarModelos(item.code);

      setModelos(dados);
    } catch {
      setMensagem(
        "Não foi possível carregar os modelos."
      );
    } finally {
      setCarregandoModelos(false);
    }
  }

  async function selecionarModelo(
    item: ItemAPI
  ) {
    if (!marca) return;

    setModelo(item);
    setAno(null);
    setDadosFipe(null);
    setResultado(null);
    setAnos([]);

    try {
      setMensagem("");
      setCarregandoAnos(true);

      const dados = await buscarAnos(
        marca.code,
        item.code
      );

      setAnos(dados);
    } catch {
      setMensagem(
        "Não foi possível carregar os anos."
      );
    } finally {
      setCarregandoAnos(false);
    }
  }

  async function selecionarAno(
    item: ItemAPI
  ) {
    if (!marca || !modelo) return;

    setAno(item);
    setDadosFipe(null);
    setResultado(null);

    try {
      setMensagem("");
      setCarregandoFipe(true);

      const dados =
        await buscarDadosFipe(
          marca.code,
          modelo.code,
          item.code
        );

      setDadosFipe(dados);
    } catch {
      setMensagem(
        "Não foi possível consultar os dados FIPE desse veículo."
      );
    } finally {
      setCarregandoFipe(false);
    }
  }

  function analisar() {
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
      condicaoPneu:
        condicaoPneu ?? "",
      mesesUltimaRevisao,
    });

    if (erro) {
      setMensagem(erro);
      return;
    }

    if (
      !dadosFipe ||
      !tipoPneu ||
      !tipoUso ||
      !condicaoPneu
    ) {
      return;
    }

    setMensagem("");
    setAnalisando(true);

    const novoResultado =
      analisarVeiculo(dadosFipe, {
        km: Number(km),
        peso: Number(peso),
        calibragem: Number(calibragem),
        pneu: tipoPneu,
        tipoUso,
        condicaoPneu,
        mesesUltimaRevisao: Number(
          mesesUltimaRevisao
        ),
      });

    setResultado(novoResultado);

    setTimeout(() => {
      setAnalisando(false);

      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 500);
  }

  function limpar() {
    setMarca(null);
    setModelo(null);
    setAno(null);

    setModelos([]);
    setAnos([]);

    setDadosFipe(null);
    setResultado(null);

    setKm("");
    setPeso("");
    setCalibragem("");
    setMesesUltimaRevisao("");

    setTipoPneu(null);
    setTipoUso(null);
    setCondicaoPneu(null);

    setMensagem("");

    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  }

  const entradaY =
    entrada.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
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
            transform: [
              {
                translateY: entradaY,
              },
            ],
          }}
        >
          <Header
            online={marcas.length > 0}
            carregando={carregandoMarcas}
          />

          {mensagem !== "" && (
            <View style={styles.mensagemErro}>
              <Text style={styles.erroTitulo}>
                Atenção
              </Text>

              <Text style={styles.erroTexto}>
                {mensagem}
              </Text>

              {marcas.length === 0 &&
                !carregandoMarcas && (
                  <TouchableOpacity
                    style={
                      styles.tentarNovamente
                    }
                    onPress={carregarMarcas}
                  >
                    <Text
                      style={
                        styles.tentarNovamenteTexto
                      }
                    >
                      Tentar novamente
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          )}

          <VehicleSelector
            marca={marca}
            modelo={modelo}
            ano={ano}
            dadosFipe={dadosFipe}
            carregandoMarcas={
              carregandoMarcas
            }
            carregandoModelos={
              carregandoModelos
            }
            carregandoAnos={
              carregandoAnos
            }
            carregandoFipe={
              carregandoFipe
            }
            marcasDisponiveis={
              marcas.length > 0
            }
            modelosDisponiveis={
              modelos.length > 0
            }
            anosDisponiveis={
              anos.length > 0
            }
            abrirMarca={() =>
              setModalMarca(true)
            }
            abrirModelo={() =>
              setModalModelo(true)
            }
            abrirAno={() =>
              setModalAno(true)
            }
          />

          <VehicleForm
            km={km}
            setKm={setKm}
            peso={peso}
            setPeso={setPeso}
            calibragem={calibragem}
            setCalibragem={setCalibragem}
            mesesUltimaRevisao={
              mesesUltimaRevisao
            }
            setMesesUltimaRevisao={
              setMesesUltimaRevisao
            }
            tipoPneu={tipoPneu}
            setTipoPneu={setTipoPneu}
            tipoUso={tipoUso}
            setTipoUso={setTipoUso}
            condicaoPneu={condicaoPneu}
            setCondicaoPneu={
              setCondicaoPneu
            }
          />

          <TouchableOpacity
            style={styles.botao}
            onPress={analisar}
            disabled={analisando}
          >
            {analisando ? (
              <>
                <ActivityIndicator
                  color="#fff"
                  size="small"
                />

                <Text
                  style={[
                    styles.botaoTexto,
                    styles.botaoTextoCarregando,
                  ]}
                >
                  Analisando...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.botaoTexto}>
                  Analisar veículo
                </Text>

                <Text style={styles.botaoSeta}>
                  →
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {resultado && dadosFipe && (
          <ResultCard
            resultado={resultado}
            dadosFipe={dadosFipe}
            limpar={limpar}
          />
        )}

        <View style={styles.footer}>
          <Text style={styles.footerLogo}>
            Torque
            <Text style={styles.logoVermelho}>
              Lab
            </Text>
          </Text>

          <Text style={styles.footerTexto}>
            Simulador veicular educacional •{" "}
            {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>

      <SeletorModal
        visible={modalMarca}
        titulo="Selecionar marca"
        itens={marcas}
        carregando={carregandoMarcas}
        onClose={() =>
          setModalMarca(false)
        }
        onSelect={selecionarMarca}
      />

      <SeletorModal
        visible={modalModelo}
        titulo="Selecionar modelo"
        itens={modelos}
        carregando={carregandoModelos}
        onClose={() =>
          setModalModelo(false)
        }
        onSelect={selecionarModelo}
      />

      <SeletorModal
        visible={modalAno}
        titulo="Selecionar ano"
        itens={anos}
        carregando={carregandoAnos}
        onClose={() =>
          setModalAno(false)
        }
        onSelect={selecionarAno}
      />
    </>
  );
}