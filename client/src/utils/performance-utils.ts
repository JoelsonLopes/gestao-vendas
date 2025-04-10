/**
 * Utilitários para otimização de performance da aplicação
 */

/**
 * Otimiza as imagens em toda a aplicação para melhorar o carregamento
 * @param imageUrl URL da imagem a ser otimizada
 * @param width Largura desejada
 * @param quality Qualidade da imagem (0-100)
 */
export function getOptimizedImageUrl(imageUrl: string, width: number = 400, quality: number = 80): string {
  // Se for uma URL externa (e.g., uma CDN), adicionar parâmetros de otimização 
  if (imageUrl.startsWith('http')) {
    // Adicionar parâmetros de otimização para serviços comuns de imagens
    if (imageUrl.includes('cloudinary.com')) {
      // Formato: https://res.cloudinary.com/demo/image/upload/w_400,q_80/sample.jpg
      return imageUrl.replace('/upload/', `/upload/w_${width},q_${quality}/`);
    }
    
    // Caso seja uma URL genérica, apenas adicionar parâmetros de largura e qualidade
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}w=${width}&q=${quality}`;
  }
  
  // Para imagens locais, retornar a URL original
  return imageUrl;
}

/**
 * Remove logs desnecessários em produção para melhorar a performance
 */
export function setupProductionLogging() {
  // No ambiente de produção, desativa logs não-críticos
  if (import.meta.env.PROD) {
    const noop = () => {};
    // @ts-ignore
    console.debug = noop;
    
    // Preserva logs originais para erros e alertas críticos
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args: any[]) => {
      // Registrar erros críticos mesmo em produção
      originalError(...args);
    };
    
    console.warn = (...args: any[]) => {
      // Filtrar alguns avisos menos importantes
      const message = args[0]?.toString() || '';
      if (
        !message.includes('deprecated') && 
        !message.includes('is not recommended') &&
        !message.includes('Consider using')
      ) {
        originalWarn(...args);
      }
    };
  }
}

/**
 * Adiciona detecção de memória para monitorar o desempenho da aplicação
 */
export function monitorMemoryUsage(callback?: (memoryInfo: any) => void) {
  if ('performance' in window && 'memory' in (performance as any)) {
    const memoryInfo = (performance as any).memory;
    if (callback) {
      callback(memoryInfo);
    }
    return memoryInfo;
  }
  return null;
}

/**
 * Aplica limitação de taxa à função fornecida 
 * Para evitar chamadas excessivas a funções que causam impacto de performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 100
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let inThrottle = false;
  let lastResult: ReturnType<T> | undefined;
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  };
}

/**
 * Adiciona debounce à função fornecida
 * Útil para eventos de entrada do usuário onde não queremos responder a cada digitação
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(this: any, ...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}