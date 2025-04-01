import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex flex-shrink-0 items-center", className)}>
      <div className="flex items-center">
        <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">Gestão</span>
        <span className="text-purple-600 dark:text-purple-400 font-bold text-xl">Pedidos</span>
        <div className="w-2 h-2 bg-purple-500 rounded-full ml-1"></div>
      </div>
    </div>
  );
}
