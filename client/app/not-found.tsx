import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-24 text-center">
      <div className="inline-block border border-white/20 bg-neutral-950 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-white mb-6">
        404
      </div>
      <h1 className="text-xl md:text-2xl font-normal uppercase tracking-wider text-white mb-3">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-xs text-neutral-400 font-mono max-w-md mx-auto mb-8 leading-relaxed">
        Halaman atau video yang Anda tuju mungkin telah dihapus, dipindahkan, atau tautan tidak valid.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/" className="gap-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
      </Button>
    </div>
  );
}
