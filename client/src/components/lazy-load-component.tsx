import { useState, useEffect, useRef, ReactNode } from 'react';

interface LazyLoadComponentProps {
  children: ReactNode;
  height?: string | number;
  width?: string | number;
  placeholder?: ReactNode;
  threshold?: number;
  className?: string;
}

/**
 * Componente que carrega seu conteúdo apenas quando ele entra na viewport
 * Útil para otimizar a renderização inicial de componentes pesados
 */
export function LazyLoadComponent({
  children,
  height = 'auto',
  width = '100%',
  placeholder = null,
  threshold = 0.1,
  className = '',
}: LazyLoadComponentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Usar IntersectionObserver para detectar quando o componente está visível na tela
  useEffect(() => {
    // Inicializar o componente como carregado no modo de desenvolvimento
    // para facilitar o desenvolvimento e debug
    if (import.meta.env.DEV) {
      setIsVisible(true);
      setHasLoaded(true);
      return;
    }

    // Verificar se o navegador suporta IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  // Efeito para registrar que o componente foi carregado
  useEffect(() => {
    if (isVisible) {
      setHasLoaded(true);
    }
  }, [isVisible]);

  const containerStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: !isVisible ? (typeof height === 'number' ? `${height}px` : height) : 'auto',
  };

  return (
    <div
      ref={containerRef}
      className={`lazy-load-container ${className}`}
      style={containerStyle}
    >
      {isVisible ? (
        children
      ) : (
        placeholder || (
          <div
            className="flex items-center justify-center bg-gray-100 animate-pulse"
            style={containerStyle}
          >
            <span className="sr-only">Carregando...</span>
          </div>
        )
      )}
    </div>
  );
}