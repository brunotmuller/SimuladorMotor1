import React from "react";

import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { styles } from "../(tabs)/styles/styles";

import {
  DadosFipe,
  ItemAPI,
} from "../(tabs)/types/vehicle";

import FipeCard from "./FipeCard";

type Props = {
  marca: ItemAPI | null;
  modelo: ItemAPI | null;
  ano: ItemAPI | null;

  dadosFipe: DadosFipe | null;

  carregandoMarcas: boolean;
  carregandoModelos: boolean;
  carregandoAnos: boolean;
  carregandoFipe: boolean;

  marcasDisponiveis: boolean;
  modelosDisponiveis: boolean;
  anosDisponiveis: boolean;

  abrirMarca: () => void;
  abrirModelo: () => void;
  abrirAno: () => void;
};

type SeletorProps = {
  label: string;
  valor?: string;
  placeholder: string;
  carregando: boolean;
  disabled: boolean;
  onPress: () => void;
};

function Seletor({
  label,
  valor,
  placeholder,
  carregando,
  disabled,
  onPress,
}: SeletorProps) {
  return (
    <>
      <Text style={styles.label}>
        {label}
      </Text>

      <TouchableOpacity
        style={[
          styles.seletor,
          disabled && styles.desativado,
        ]}
        disabled={disabled}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.seletorTexto,
            !valor && styles.placeholder,
          ]}
        >
          {carregando
            ? "Carregando..."
            : valor || placeholder}
        </Text>

        {carregando ? (
          <ActivityIndicator
            size="small"
            color="#ef3340"
          />
        ) : (
          <Text style={styles.chevron}>
            ›
          </Text>
        )}
      </TouchableOpacity>
    </>
  );
}

export default function VehicleSelector({
  marca,
  modelo,
  ano,
  dadosFipe,

  carregandoMarcas,
  carregandoModelos,
  carregandoAnos,
  carregandoFipe,

  marcasDisponiveis,
  modelosDisponiveis,
  anosDisponiveis,

  abrirMarca,
  abrirModelo,
  abrirAno,
}: Props) {
  return (
    <View nativeID="vehicle-section" style={styles.card}>
      <View style={styles.sectionKicker}><Text style={styles.sectionKickerText}>01  /  IDENTIFICAÇÃO</Text></View>
      <Text style={styles.tituloSecao}>
        Veículo
      </Text>
      <Text style={styles.descricaoSecao}>Comece pela marca. As opções seguintes aparecem conforme você escolhe.</Text>

      <Seletor
        label="Marca"
        valor={marca?.name}
        placeholder="Selecionar marca"
        carregando={carregandoMarcas}
        disabled={
          carregandoMarcas ||
          !marcasDisponiveis
        }
        onPress={abrirMarca}
      />

      <Seletor
        label="Modelo"
        valor={modelo?.name}
        placeholder={marca ? "Selecionar modelo" : "Escolha a marca primeiro"}
        carregando={carregandoModelos}
        disabled={
          !marca ||
          carregandoModelos ||
          !modelosDisponiveis
        }
        onPress={abrirModelo}
      />

      <Seletor
        label="Ano / combustível"
        valor={ano?.name}
        placeholder={modelo ? "Selecionar ano" : "Escolha o modelo primeiro"}
        carregando={carregandoAnos}
        disabled={
          !modelo ||
          carregandoAnos ||
          !anosDisponiveis
        }
        onPress={abrirAno}
      />

      {carregandoFipe && (
        <View style={styles.carregando}>
          <ActivityIndicator
            color="#ef3340"
            size="small"
          />

          <Text style={styles.carregandoTexto}>
            Consultando FIPE...
          </Text>
        </View>
      )}

      {dadosFipe && (
        <FipeCard dados={dadosFipe} />
      )}
    </View>
  );
}
