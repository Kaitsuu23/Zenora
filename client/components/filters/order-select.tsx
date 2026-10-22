"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface OrderOption {
  value: string;
  label: string;
}

interface OrderSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly OrderOption[] | OrderOption[];
  ariaLabel?: string;
}

export function OrderSelect({
  value,
  onChange,
  options,
  ariaLabel = "Urutkan",
}: OrderSelectProps) {
  return (
    <div className="w-[160px]">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={ariaLabel}>
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
