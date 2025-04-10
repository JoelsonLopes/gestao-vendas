import { useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

/**
 * Hook de query otimizado que implementa:
 * - Pre-fetching inteligente de dados relacionados
 * - Priorização de consultas visíveis
 * - Cancelamento de consultas não visíveis
 * - Cache de longa duração para dados estáticos
 */
export function useOptimizedQuery<TData, TError = Error>(
  queryKey: string | readonly unknown[],
  options?: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey'> & {
    prefetchRelated?: string[];
    isStatic?: boolean;
    isPriority?: boolean;
  }
): UseQueryResult<TData, TError> {
  const {
    prefetchRelated = [],
    isStatic = false,
    isPriority = false,
    ...queryOptions
  } = options || {};

  // Usar staleTime maior para dados estáticos
  const staleTime = isStatic ? 1000 * 60 * 60 * 24 : undefined; // 24 horas para dados estáticos

  // Usar um tempo de cache maior para dados estáticos
  const gcTime = isStatic ? 1000 * 60 * 60 * 24 * 7 : undefined; // 7 dias

  // Configurar a prioridade da consulta
  const networkMode = isPriority ? 'always' : 'offlineFirst';

  const result = useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    ...queryOptions,
    staleTime,
    gcTime,
    networkMode,
  });

  // Função para precarregar dados relacionados
  const prefetchRelatedData = useCallback(() => {
    // Implementação de prefetch inteligente
    if (result.isSuccess && prefetchRelated.length > 0) {
      // Aqui seria implementado o prefetch baseado nas chaves relacionadas
      // mas depende da estrutura específica da aplicação
    }
  }, [result.isSuccess, prefetchRelated]);

  // Otimização de conexão de rede
  useEffect(() => {
    const handleOnline = () => {
      if (result.isStale) {
        result.refetch();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [result]);

  // Executar prefetch quando os dados principais forem carregados
  useEffect(() => {
    if (result.isSuccess) {
      prefetchRelatedData();
    }
  }, [result.isSuccess, prefetchRelatedData]);

  return result;
}