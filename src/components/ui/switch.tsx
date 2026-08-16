"use client";

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, description, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kriyo-cyan disabled:cursor-not-allowed disabled:opacity-60',
        checked
          ? 'border-kriyo-cyan/40 bg-kriyo-cyan/10'
          : 'border-kriyo-borderSoft bg-kriyo-surface hover:bg-kriyo-surfaceHover'
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-kriyo-text">{label}</span>
        {description ? <span className="mt-1 block text-xs text-kriyo-dim">{description}</span> : null}
      </span>
      <span
        className={cn(
          'relative h-7 w-12 rounded-full border transition',
          checked ? 'border-kriyo-cyan bg-kriyo-cyan/30' : 'border-kriyo-border bg-kriyo-bg'
        )}
      >
        <span
          className={cn(
            'absolute left-1 top-1 h-5 w-5 rounded-full transition-transform',
            checked ? 'translate-x-5 bg-kriyo-cyan' : 'bg-kriyo-text/70'
          )}
        />
      </span>
    </button>
  );
}
