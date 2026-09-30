import AsyncStorage from "@react-native-async-storage/async-storage";
import { AnaliseSalva } from "../types/savedAnalysis";

const STORAGE_KEY = "torquelab-analises-v1";

export async function carregarAnalises(): Promise<AnaliseSalva[]> {
  try {
    const valor = await AsyncStorage.getItem(STORAGE_KEY);
    const dados: unknown = valor ? JSON.parse(valor) : [];
    return Array.isArray(dados)
      ? dados.filter((item): item is AnaliseSalva =>
          !!item && typeof item.id === "string" && !!item.fipe && !!item.resultado && !!item.dados && !!item.selecao
        )
      : [];
  } catch {
    return [];
  }
}

export async function gravarAnalises(analises: AnaliseSalva[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(analises));
    return true;
  } catch {
    return false;
  }
}
