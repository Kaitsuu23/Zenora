"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/common/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-16">
      <ErrorState
        title="Terjadi Gangguan pada Halaman"
        message={error.message || "Gagal memuat konten. Pastikan server API sedang aktif."}
        onRetry={() => reset()}
      />
    </div>
  );
}
