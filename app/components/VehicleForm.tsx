import React from "react";

import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { styles } from "../(tabs)/styles/styles";

import {
  CONDICOES_PNEU,
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

type OpcoesProps<T extends string> = {
  titulo: string;
  itens: readonly T[];
  selecionado: T | null;
  selecionar: (value: T) => void;
};

function Opcoes<T extends string>({
  titulo,
  itens,
  selecionado,
  selecionar,
}: OpcoesProps<T>) {
  return (
    <>
      <Text style={styles.label}>
        {titulo}
      </Text>

      <View style={styles.opcoes}>
        {itens.map((item) => {
          const ativo = selecionado === item;

          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.opcao,
                ativo && styles.opcaoAtiva,
              ]}
              activeOpacity={0.8}
              onPress={() => selecionar(item)}
            >
              <Text
                style={[
                  styles.opcaoTexto,
                  ativo && styles.opcaoTextoAtivo,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  return (
    <View style={styles.card}>
      <Text style={styles.tituloSecao}>
        Dados atuais
      </Text>

      <Text style={styles.label}>
        Quilometragem
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Ex: 65000"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={km}
        maxLength={7}
        onChangeText={(texto) =>
          setKm(apenasNumero(texto))
        }
      />

      <Text style={styles.label}>
        Peso aproximado (kg)
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Ex: 1350"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={peso}
        maxLength={4}
        onChangeText={(texto) =>
          setPeso(apenasNumero(texto))
        }
      />

      <Text style={styles.label}>
        Calibragem atual (PSI)
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Ex: 32"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={calibragem}
        maxLength={2}
        onChangeText={(texto) =>
          setCalibragem(apenasNumero(texto))
        }
      />

      <Text style={styles.label}>
        Meses desde a última revisão
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Ex: 6"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={mesesUltimaRevisao}
        maxLength={3}
        onChangeText={(texto) =>
          setMesesUltimaRevisao(
            apenasNumero(texto)
          )
        }
      />

      <Opcoes
        titulo="Tipo de pneu"
        itens={TIPOS_PNEU}
        selecionado={tipoPneu}
        selecionar={setTipoPneu}
      />

      <Opcoes
        titulo="Condição dos pneus"
        itens={CONDICOES_PNEU}
        selecionado={condicaoPneu}
        selecionar={setCondicaoPneu}
      />

      <Opcoes
        titulo="Uso predominante"
        itens={TIPOS_USO}
        selecionado={tipoUso}
        selecionar={setTipoUso}
      />
    </View>
  );
}