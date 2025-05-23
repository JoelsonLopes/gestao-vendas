import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Construir a URL a partir do queryKey
    let url: string;
    
    if (Array.isArray(queryKey)) {
      if (queryKey.length === 1) {
        // Simples endpoint
        url = queryKey[0] as string;
      } else {
        // Construir URL com múltiplos segmentos
        const segments = queryKey.map(segment => String(segment));
        url = segments.join('/');
        
        // Garantir que a URL comece com /api/ e não tenha barras duplicadas
        if (!url.startsWith('/api/')) {
          url = `/api/${url}`;
        }
        url = url.replace(/\/+/g, '/');
      }
    } else {
      url = String(queryKey);
    }
    
    // Removido console.log para melhorar performance
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos de cache para melhorar performance
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
