import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { styles } from "../(tabs)/styles/styles";
import { ItemAPI } from "../(tabs)/types/vehicle";

type Props = {
  visible: boolean;
  titulo: string;
  itens: ItemAPI[];
  carregando?: boolean;
  onClose: () => void;
  onSelect: (item: ItemAPI) => void;
};

export default function SeletorModal({
  visible,
  titulo,
  itens,
  carregando = false,
  onClose,
  onSelect,
}: Props) {
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (visible) {
      setBusca("");
    }
  }, [visible]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return itens;
    }

    return itens.filter((item) =>
      item.name.toLowerCase().includes(termo)
    );
  }, [busca, itens]);

  function selecionar(item: ItemAPI) {
    onSelect(item);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalFundo}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>
              {titulo}
            </Text>

            <TouchableOpacity
              onPress={onClose}
              style={styles.fechar}
              activeOpacity={0.7}
            >
              <Text style={styles.fecharTexto}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.busca}
            placeholder="Pesquisar..."
            placeholderTextColor="#666"
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
            autoCapitalize="none"
          />

          {carregando ? (
            <View style={styles.modalCarregando}>
              <ActivityIndicator
                color="#ef3340"
                size="small"
              />

              <Text style={styles.textoSecundario}>
                Carregando...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.lista}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filtrados.map((item) => (
                <TouchableOpacity
                  key={String(item.code)}
                  style={styles.itemLista}
                  activeOpacity={0.7}
                  onPress={() => selecionar(item)}
                >
                  <Text
                    style={styles.itemTexto}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  <Text style={styles.setaLista}>
                    ›
                  </Text>
                </TouchableOpacity>
              ))}

              {!carregando &&
                filtrados.length === 0 && (
                  <Text style={styles.semResultado}>
                    Nenhum resultado encontrado.
                  </Text>
                )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}