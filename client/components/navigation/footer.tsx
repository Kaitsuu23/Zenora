import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black mt-20 py-10">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-mono text-sm font-bold tracking-widest text-white border border-white px-1.5 py-0.5">
                ZENORA
              </span>
              <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
                ARCHIVE & STREAM
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-500 max-w-md leading-relaxed">
              Platform kurasi dan streaming video berkecepatan tinggi dengan antarmuka monokrom.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
            <Link href="/browse" className="hover:text-white transition-colors">
              Browse
            </Link>
            <Link href="/genres" className="hover:text-white transition-colors">
              Genres
            </Link>
            <Link href="/pornstars" className="hover:text-white transition-colors">
              Pornstars
            </Link>
            <Link href="/channel/fc2ppv" className="hover:text-white transition-colors">
              FC2PPV
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono tracking-widest uppercase text-neutral-600">
          <p>&copy; {new Date().getFullYear()} ZENORA. SELURUH HAK CIPTA DILINDUNGI.</p>
          <p className="text-center sm:text-right">
            KONTEN DEWASA 18+ &bull; R-18 STRICT COMPLIANCE
          </p>
        </div>
      </div>
    </footer>
  );
}
