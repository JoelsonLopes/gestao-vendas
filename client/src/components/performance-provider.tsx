import { useState, useCallback, ReactNode, useEffect, createContext, useContext } from 'react';

// Interface de contexto para métricas de performance
interface PerformanceMetrics {
  // Tempo de carregamento inicial
  initialLoadTime: number | null;
  // Tempo para primeira pintura significativa
  firstPaint: number | null;
  // Tempo para carregamento completo
  fullyLoaded: number | null;
  // Memória utilizada (apenas em navegadores compatíveis)
  memoryUsage: number | null;
  // Buscar métricas atualizadas
  refreshMetrics: () => void;
}

const PerformanceContext = createContext<PerformanceMetrics>({
  initialLoadTime: null,
  firstPaint: null,
  fullyLoaded: null,
  memoryUsage: null,
  refreshMetrics: () => {}
});

export const usePerformanceMetrics = () => useContext(PerformanceContext);

interface PerformanceProviderProps {
  children: ReactNode;
}

/**
 * Provedor que coleta e expõe métricas de performance da aplicação
 */
export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const [initialLoadTime, setInitialLoadTime] = useState<number | null>(null);
  const [firstPaint, setFirstPaint] = useState<number | null>(null);
  const [fullyLoaded, setFullyLoaded] = useState<number | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);

  // Função para coletar métricas de performance
  const collectMetrics = useCallback(() => {
    // Métricas de navegação
    if (window.performance) {
      const navigationEntries = window.performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
        setInitialLoadTime(navEntry.domContentLoadedEventEnd - navEntry.startTime);
        setFullyLoaded(navEntry.loadEventEnd - navEntry.startTime);
      }

      // First Paint
      const paintEntries = window.performance.getEntriesByType('paint');
      const firstPaintEntry = paintEntries.find(entry => entry.name === 'first-paint');
      if (firstPaintEntry) {
        setFirstPaint(firstPaintEntry.startTime);
      }

      // Memória (disponível em alguns navegadores)
      if (performance && (performance as any).memory) {
        setMemoryUsage((performance as any).memory.usedJSHeapSize / (1024 * 1024));
      }
    }
  }, []);

  // Coletar métricas na montagem do componente
  useEffect(() => {
    // Aguardar o carregamento completo da página
    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
      return () => window.removeEventListener('load', collectMetrics);
    }
  }, [collectMetrics]);

  // Implementar preloading para rotas comuns
  useEffect(() => {
    // Preload de páginas comuns
    const preloadRoutes = ['/clients', '/products', '/orders'];
    
    const preloadLinks = preloadRoutes.map(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      return link;
    });
    
    preloadLinks.forEach(link => document.head.appendChild(link));
    
    return () => {
      preloadLinks.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, []);

  return (
    <PerformanceContext.Provider 
      value={{ 
        initialLoadTime, 
        firstPaint, 
        fullyLoaded, 
        memoryUsage,
        refreshMetrics: collectMetrics
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
}