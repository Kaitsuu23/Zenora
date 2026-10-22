"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PERIOD_OPTIONS = [
  { value: "all-time", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "yesterday", label: "Kemarin" },
  { value: "this-week", label: "Minggu Ini" },
  { value: "this-month", label: "Bulan Ini" },
  { value: "this-year", label: "Tahun Ini" },
] as const;

interface PeriodSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PeriodSelect({
  value = "all-time",
  onChange,
  disabled = false,
}: PeriodSelectProps) {
  if (disabled) {
    return null;
  }

  return (
    <div className="w-[160px]">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Pilih Periode">
          <SelectValue placeholder="Periode" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
