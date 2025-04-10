import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { getOptimizedImageUrl } from '@/utils/performance-utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  placeholderColor?: string;
  className?: string;
  lazyLoad?: boolean;
}

/**
 * Componente de imagem otimizado que:
 * 1. Implementa lazy loading automático
 * 2. Otimiza URLs de imagens para melhor performance
 * 3. Mostra um placeholder enquanto a imagem carrega
 * 4. Implementa fallback para imagens com erro
 */
export function OptimizedImage({
  src,
  alt,
  width = 400,
  height,
  quality = 80,
  placeholderColor = "#f3f4f6",
  className = "",
  lazyLoad = true,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');

  // Aplicar otimização de URL
  useEffect(() => {
    setImageSrc(getOptimizedImageUrl(src, width, quality));
  }, [src, width, quality]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    console.warn(`Erro ao carregar imagem: ${src}`);
  };

  // Estilos dinâmicos para o placeholder
  const placeholderStyle = {
    backgroundColor: placeholderColor,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    display: isLoaded ? 'none' : 'block',
  };

  // Classes para controlar a exibição da imagem durante carregamento
  const imageClasses = `${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`;

  return (
    <div className="relative inline-block overflow-hidden" style={{ width: width ? `${width}px` : 'auto', height: height ? `${height}px` : 'auto' }}>
      {/* Placeholder exibido enquanto a imagem carrega */}
      <div className="absolute inset-0" style={placeholderStyle} />

      {/* Imagem real com lazy loading */}
      {!error ? (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading={lazyLoad ? "lazy" : "eager"}
          className={imageClasses}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      ) : (
        /* Fallback para quando a imagem falha ao carregar */
        <div
          className="flex items-center justify-center bg-gray-200 text-gray-500"
          style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '200px' }}
        >
          <span className="text-sm">{alt || 'Imagem indisponível'}</span>
        </div>
      )}
    </div>
  );
}