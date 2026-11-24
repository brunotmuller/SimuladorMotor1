import React, { useState } from "react";

import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { styles } from "../(tabs)/styles/styles";

import {
  CONDICOES_PNEU,
  EXPLICACAO_CONDICAO,
  EXPLICACAO_PNEU,
  EXPLICACAO_USO,
  TIPOS_PNEU,
  TIPOS_USO,
} from "../(tabs)/constants/vehicleOptions";

import {
  CondicaoPneu,
  TipoPneu,
  TipoUso,
} from "../(tabs)/types/vehicle";

import { apenasNumero } from "../(tabs)/utils/validators";

type Props = {
  km: string;
  setKm: (value: string) => void;
  peso: string;
  setPeso: (value: string) => void;
  calibragem: string;
  setCalibragem: (value: string) => void;
  mesesUltimaRevisao: string;
  setMesesUltimaRevisao: (value: string) => void;
  tipoPneu: TipoPneu | null;
  setTipoPneu: (value: TipoPneu) => void;
  tipoUso: TipoUso | null;
  setTipoUso: (value: TipoUso) => void;
  condicaoPneu: CondicaoPneu | null;
  setCondicaoPneu: (value: CondicaoPneu) => void;
};

const DICAS: Record<string, string> = {
  km: "Veja no painel (odômetro). Usados comuns: 30 mil a 120 mil km.",
  peso: "Carro pequeno ~1.100–1.400 kg · SUV ~1.500–2.200 kg.",
  calibragem: "Etiqueta na porta do motorista ou manual. Faixa comum: 30–35 PSI.",
  revisao: "Quantos meses se passaram desde a última revisão (não o ano).",
};

type OpcoesProps<T extends string> = {
  titulo: string;
  itens: readonly T[];
  selecionado: T | null;
  selecionar: (value: T) => void;
  explicacoes?: Record<T, string>;
};

function Opcoes<T extends string>({
  titulo,
  itens,
  selecionado,
  selecionar,
  explicacoes,
}: OpcoesProps<T>) {
  return (
    <>
      <Text style={styles.label}>{titulo}</Text>
      <View style={styles.opcoes}>
        {itens.map((item) => {
          const ativo = selecionado === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.opcao, ativo && styles.opcaoAtiva]}
              activeOpacity={0.8}
              onPress={() => selecionar(item)}
            >
              <Text
                style={[styles.opcaoTexto, ativo && styles.opcaoTextoAtivo]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selecionado && explicacoes?.[selecionado] ? (
        <Text style={[styles.textoAjuda, { marginTop: 0, marginBottom: 14 }]}>
          {explicacoes[selecionado]}
        </Text>
      ) : null}
    </>
  );
}

export default function VehicleForm({
  km,
  setKm,
  peso,
  setPeso,
  calibragem,
  setCalibragem,
  mesesUltimaRevisao,
  setMesesUltimaRevisao,
  tipoPneu,
  setTipoPneu,
  tipoUso,
  setTipoUso,
  condicaoPneu,
  setCondicaoPneu,
}: Props) {
  const [dicaAtiva, setDicaAtiva] = useState<string | null>(null);

  return (
    <View nativeID="data-section" style={styles.card}>
      <View style={styles.sectionKicker}>
        <Text style={styles.sectionKickerText}>02  /  CONDIÇÃO ATUAL</Text>
      </View>
      <Text style={styles.tituloSecao}>Dados atuais</Text>
      <Text style={styles.descricaoSecao}>
        Preencha os dados do carro. Toque em um campo para ver uma dica.
      </Text>

      {dicaAtiva && DICAS[dicaAtiva] ? (
        <View style={styles.dicaBox}>
          <Text style={styles.dicaTitulo}>DICA</Text>
          <Text style={styles.dicaTexto}>{DICAS[dicaAtiva]}</Text>
        </View>
      ) : (
        <View style={styles.dicaBox}>
          <Text style={styles.dicaTitulo}>DICA RÁPIDA</Text>
          <Text style={styles.dicaTexto}>
            Não sabe os números? Use o guia do carro acima e um exemplo pronto.
          </Text>
        </View>
      )}

      <Text style={styles.label}>Quilometragem</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 65000"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={km}
        maxLength={7}
        onFocus={() => setDicaAtiva("km")}
        onChangeText={(texto) => setKm(apenasNumero(texto))}
      />

      <Text style={styles.label}>Peso aproximado (kg)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 1350"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={peso}
        maxLength={4}
        onFocus={() => setDicaAtiva("peso")}
        onChangeText={(texto) => setPeso(apenasNumero(texto))}
      />

      <Text style={styles.label}>Calibragem atual (PSI)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 32"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={calibragem}
        maxLength={2}
        onFocus={() => setDicaAtiva("calibragem")}
        onChangeText={(texto) => setCalibragem(apenasNumero(texto))}
      />

      <Text style={styles.label}>Meses desde a última revisão</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 6"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={mesesUltimaRevisao}
        maxLength={3}
        onFocus={() => setDicaAtiva("revisao")}
        onChangeText={(texto) => setMesesUltimaRevisao(apenasNumero(texto))}
      />

      <Opcoes
        titulo="Tipo de pneu"
        itens={TIPOS_PNEU}
        selecionado={tipoPneu}
        selecionar={setTipoPneu}
        explicacoes={EXPLICACAO_PNEU}
      />

      <Opcoes
        titulo="Condição dos pneus"
        itens={CONDICOES_PNEU}
        selecionado={condicaoPneu}
        selecionar={setCondicaoPneu}
        explicacoes={EXPLICACAO_CONDICAO}
      />

      <Opcoes
        titulo="Uso predominante"
        itens={TIPOS_USO}
        selecionado={tipoUso}
        selecionar={setTipoUso}
        explicacoes={EXPLICACAO_USO}
      />
    </View>
  );
}
