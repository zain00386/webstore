"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** Usually the available stock. The server re-checks this at checkout. */
  max: number;
  label: string;
  disabled?: boolean;
};

export function QuantityStepper({ value, onChange, min = 1, max, label, disabled }: QuantityStepperProps) {
  const clamp = (n: number) => Math.min(Math.max(n, min), Math.max(min, max));
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus aria-hidden />
      </Button>
      <output aria-live="polite" className="w-8 text-center text-sm font-semibold tabular-nums">
        {value}
      </output>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
