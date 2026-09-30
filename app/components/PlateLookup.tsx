import React, { useState } from "react";
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { consultarPlaca, consultaPlacaConfigurada, formatarPlaca, placaValida, PlacaNaoEncontradaError, VeiculoPorPlaca } from "../(tabs)/services/plateApi";
import { styles } from "../(tabs)/styles/styles";

function Detalhe({ rotulo, valor }: { rotulo: string; valor?: string | number | boolean }) {
  if (valor === undefined || valor === null || valor === "") return null;
  return (
    <View style={styles.placaDetalhe}>
      <Text style={styles.placaRotulo}>{rotulo}</Text>
      <Text style={styles.placaValor}>{typeof valor === "boolean" ? (valor ? "Sim" : "Não") : valor}</Text>
    </View>
  );
}

export default function PlateLookup() {
  const [placa, setPlaca] = useState("");
  const [resultado, setResultado] = useState<VeiculoPorPlaca | null>(null);
  const [erro, setErro] = useState("");
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [imagemIndisponivel, setImagemIndisponivel] = useState(false);

  async function buscar() {
    setErro("");
    setNaoEncontrada(false);
    setResultado(null);
    setImagemIndisponivel(false);
    setCarregando(true);
    try {
      setResultado(await consultarPlaca(placa));
    } catch (falha) {
      if (falha instanceof PlacaNaoEncontradaError) setNaoEncontrada(true);
      else setErro(falha instanceof Error ? falha.message : "Não foi possível consultar a placa.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.sectionKicker}><Text style={styles.sectionKickerText}>CONSULTA POR PLACA</Text></View>
      <Text style={styles.tituloSecao}>Encontre os dados pela placa</Text>
      <Text style={styles.descricaoSecao}>Digite uma placa para consultar os dados disponíveis na Falcon Data Hub.</Text>
      <Text style={styles.label}>Placa do veículo</Text>
      <TextInput
        style={styles.input}
        value={placa}
        onChangeText={(valor) => { setPlaca(formatarPlaca(valor)); setResultado(null); setErro(""); setNaoEncontrada(false); setImagemIndisponivel(false); }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="ABC-1D23 ou ABC-1234"
        placeholderTextColor="#9d858b"
        accessibilityLabel="Placa do veículo"
      />
      <Text style={styles.textoAjuda}>Os exemplos mostram apenas o formato da placa.</Text>
      <TouchableOpacity style={[styles.botaoSecundario, (!consultaPlacaConfigurada || !placaValida(placa) || carregando) && styles.desativado]} onPress={buscar} disabled={!consultaPlacaConfigurada || !placaValida(placa) || carregando} accessibilityRole="button">
        {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSecundarioTexto}>Consultar</Text>}
      </TouchableOpacity>
      {!consultaPlacaConfigurada && <Text style={styles.textoAjuda}>Configure o endereço do backend para ativar a consulta.</Text>}
      {naoEncontrada && <Text style={styles.placaMensagem}>A Falcon não encontrou dados para esta placa. Confira se ela está correta ou tente outra.</Text>}
      {!!erro && <Text style={styles.placaMensagem}>{erro}</Text>}
      {resultado && (
        <View style={styles.simulacaoBox}>
          <Text style={styles.simulacaoLabel}>DADOS RETORNADOS PELA FALCON</Text>
          {!!resultado.plate && <Text style={styles.placaNumero}>{formatarPlaca(resultado.plate)}</Text>}
          {(resultado.brand || resultado.model) && <Text style={styles.placaVeiculo}>{[resultado.brand, resultado.model].filter(Boolean).join(" ")}</Text>}
          <Text style={styles.placaSecaoTitulo}>Identificação</Text>
          <View style={styles.placaGrade}>
            <Detalhe rotulo="Ano" valor={resultado.year} />
            <Detalhe rotulo="Ano modelo" valor={resultado.modelYear} />
            <Detalhe rotulo="Cor" valor={resultado.color} />
            <Detalhe rotulo="Combustível" valor={resultado.fuel} />
            <Detalhe rotulo="Chassi" valor={resultado.chassis} />
            <Detalhe rotulo="Importado" valor={resultado.imported} />
          </View>
          <Text style={styles.placaSecaoTitulo}>Registro e situação</Text>
          <View style={styles.placaGrade}>
            <Detalhe rotulo="Município" valor={resultado.city} />
            <Detalhe rotulo="UF" valor={resultado.state} />
            <Detalhe rotulo="Indícios de roubo" valor={resultado.theftIndicators} />
            <Detalhe rotulo="Consulta de roubo em" valor={resultado.theftCheckedAt} />
          </View>
          {!!resultado.ipvaByState?.length && (
            <View style={styles.placaGrupo}>
              <Text style={styles.detalhesTitulo}>IPVA por estado</Text>
              {resultado.ipvaByState.map((item, index) => (
                <View key={`${item.state ?? "uf"}-${index}`} style={styles.placaIpva}>
                  <Detalhe rotulo="UF" valor={item.state} />
                  <Detalhe rotulo="Valor venal" valor={item.taxableValue} />
                  <Detalhe rotulo="Alíquota" valor={item.rate} />
                  <Detalhe rotulo="Valor IPVA" valor={item.tax} />
                </View>
              ))}
            </View>
          )}
          {!!resultado.imageUrl && !imagemIndisponivel && (
            <View style={styles.placaGrupo}>
              <Text style={styles.placaSecaoTitulo}>Imagem da placa</Text>
              <Image source={{ uri: resultado.imageUrl }} style={styles.placaImagem} resizeMode="contain" accessibilityLabel="Imagem da placa retornada pela consulta" onError={() => setImagemIndisponivel(true)} />
            </View>
          )}
          {(resultado.modelYear === undefined || resultado.color === undefined || !resultado.ipvaByState?.length || imagemIndisponivel) && (
            <View style={styles.placaAusentes}>
              <Text style={styles.placaAusentesTitulo}>Não informado nesta consulta</Text>
              <Text style={styles.placaAusentesTexto}>
                {[
                  resultado.modelYear === undefined && "ano modelo",
                  resultado.color === undefined && "cor",
                  !resultado.ipvaByState?.length && "valores de IPVA",
                  imagemIndisponivel && "imagem da placa",
                ].filter(Boolean).join(" · ")}
              </Text>
              <Text style={styles.textoAjuda}>A disponibilidade desses dados depende da resposta da Falcon para cada placa.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
