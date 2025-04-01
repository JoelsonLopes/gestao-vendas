import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex flex-shrink-0 items-center", className)}>
      <span className="text-primary-600 dark:text-primary-400 font-bold text-xl">GestãoPedidos</span>
    </div>
  );
}
