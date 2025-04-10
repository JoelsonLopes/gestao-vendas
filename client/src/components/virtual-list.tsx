import { useState, useRef, useEffect, ReactNode } from 'react';
import { throttle } from '@/utils/performance-utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  height?: number | string;
  width?: number | string;
  overscan?: number;
  className?: string;
}

/**
 * Componente que implementa virtualização para renderizar apenas os itens visíveis
 * de listas longas, melhorando significativamente o desempenho
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  height = 400,
  width = '100%',
  overscan = 5,
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calcular o container height real quando o componente montar
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === containerRef.current) {
            setContainerHeight(entry.contentRect.height);
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      setContainerHeight(containerRef.current.clientHeight);

      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
      };
    }
  }, []);

  // Lidar com eventos de scroll usando throttle para melhor performance
  const handleScroll = throttle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 50);

  // Calcular quais itens devem estar visíveis
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.min(
    items.length - startIndex,
    Math.ceil(containerHeight / itemHeight) + overscan * 2
  );
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  // Adaptar para altura automática se for um número específico de itens
  const containerStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    overflow: 'auto',
    position: 'relative' as const,
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`virtual-list-container ${className}`}
      onScroll={handleScroll}
    >
      <div 
        className="virtual-list-inner" 
        style={{ height: `${totalHeight}px`, position: 'relative' }}
      >
        <div 
          className="virtual-list-items" 
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {items.slice(startIndex, endIndex).map((item, index) => (
            <div 
              key={startIndex + index} 
              style={{ height: `${itemHeight}px` }}
              className="virtual-list-item"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}