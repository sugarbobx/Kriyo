import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-kriyo-borderSoft bg-[rgba(19,25,34,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.02),0_20px_60px_rgba(0,0,0,0.28)]',
        className
      )}
      {...props}
    />
  );
}
