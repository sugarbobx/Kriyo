import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-kriyo-border bg-kriyo-elevated px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-kriyo-dim',
        className
      )}
      {...props}
    />
  );
}
