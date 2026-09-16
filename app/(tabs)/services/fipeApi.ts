import {
    DadosFipe,
    ItemAPI,
  } from "../types/vehicle";
  
  const API =
    "https://fipe.parallelum.com.br/api/v2";
  
  async function buscarAPI<T>(url: string): Promise<T> {
    const controller = new AbortController();
  
    const timeout = setTimeout(() => {
      controller.abort();
    }, 12000);
  
    try {
      const resposta = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });
  
      if (!resposta.ok) {
        throw new Error(
          `Erro HTTP ${resposta.status}`
        );
      }
  
      return await resposta.json();
    } finally {
      clearTimeout(timeout);
    }
  }
  
  export async function buscarMarcas() {
    const dados = await buscarAPI<ItemAPI[]>(
      `${API}/cars/brands`
    );
  
    if (!Array.isArray(dados) || dados.length === 0) {
      throw new Error("Lista de marcas vazia.");
    }
  
    return dados;
  }
  
  export async function buscarModelos(
    marcaCode: string | number
  ) {
    const dados = await buscarAPI<ItemAPI[]>(
      `${API}/cars/brands/${marcaCode}/models`
    );
  
    if (!Array.isArray(dados) || dados.length === 0) {
      throw new Error("Nenhum modelo encontrado.");
    }
  
    return dados;
  }
  
  export async function buscarAnos(
    marcaCode: string | number,
    modeloCode: string | number
  ) {
    const dados = await buscarAPI<ItemAPI[]>(
      `${API}/cars/brands/${marcaCode}/models/${modeloCode}/years`
    );
  
    if (!Array.isArray(dados) || dados.length === 0) {
      throw new Error("Nenhum ano encontrado.");
    }
  
    return dados;
  }
  
  export async function buscarDadosFipe(
    marcaCode: string | number,
    modeloCode: string | number,
    anoCode: string | number
  ) {
    const dados = await buscarAPI<DadosFipe>(
      `${API}/cars/brands/${marcaCode}/models/${modeloCode}/years/${anoCode}`
    );
  
    if (
      !dados ||
      !dados.brand ||
      !dados.model ||
      !dados.price
    ) {
      throw new Error("Dados FIPE inválidos.");
    }
  
    return dados;
  }