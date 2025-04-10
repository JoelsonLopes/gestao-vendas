import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { setupProductionLogging } from "./utils/performance-utils";

// Configurar otimizações de performance
setupProductionLogging();

// Componente raiz que monta a árvore do React
const Root = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

// Adiar carregamento não-crítico para melhorar performance inicial
if (document.readyState === 'complete') {
  createRoot(document.getElementById("root")!).render(<Root />);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    createRoot(document.getElementById("root")!).render(<Root />);
  });
}
