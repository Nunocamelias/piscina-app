import React, { createContext, useContext } from 'react';

// Estado de apresentação apenas. A API continua a validar empresa/equipa via JWT.
const ContextoNaoLidas = createContext(0);

export const FornecedorNaoLidas = ContextoNaoLidas.Provider;

export function useNaoLidasMensagens(): number {
  return useContext(ContextoNaoLidas);
}
