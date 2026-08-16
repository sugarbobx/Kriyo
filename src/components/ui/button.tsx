"use client";

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'secondary' | 'ghost' | 'danger';

const styles: Record<Variant, string> = {
  default: 'bg-kriyo-cyan text-slate-950 hover:brightness-110 shadow-glow',
  secondary: 'bg-kriyo-surface text-kriyo-text hover:bg-kriyo-surfaceHover border border-kriyo-border',
  ghost: 'bg-transparent text-kriyo-dim hover:bg-kriyo-surface hover:text-kriyo-text',
  danger: 'bg-kriyo-danger text-white hover:brightness-110'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kriyo-cyan disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
