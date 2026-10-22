"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, Film, Compass, Users, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SearchModal } from "@/components/navigation/search-modal";

const NAV_LINKS = [
  { href: "/browse/recent", matchPath: "/browse", label: "Browse", icon: Compass },
  { href: "/genres", matchPath: "/genres", label: "Genres", icon: Film },
  { href: "/pornstars", matchPath: "/pornstars", label: "Pornstars", icon: Users },
  { href: "/channel/fc2ppv", matchPath: "/channel/fc2ppv", label: "FC2PPV", icon: Tv },
];

export function Navbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keyboard shortcut Ctrl+K or ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/85 backdrop-blur-md">
        <div className="container relative mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-baseline gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            <span className="font-mono text-base md:text-lg font-black tracking-widest text-white border-2 border-white px-1.5 py-0.5 leading-none">
              ZENORA
            </span>
          </Link>

          {/* Desktop Nav Items (Centered) */}
          <nav className="hidden md:flex items-center space-x-1 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.matchPath !== "/" && pathname.startsWith(link.matchPath));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors ${
                    isActive
                      ? "text-white font-bold border-b border-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Search Bar / Quick Command */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="h-10 w-10 sm:h-8 sm:w-auto gap-2 border-white/20 bg-neutral-950/80 sm:px-2.5 text-neutral-400 hover:border-white hover:text-white"
              aria-label="Cari video"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider">
                Cari Video...
              </span>
              <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 border border-white/20 bg-neutral-900 px-1 font-mono text-[9px] text-neutral-400">
                ⌘K
              </kbd>
            </Button>

            {/* Mobile Menu Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-10 w-10 text-neutral-300 hover:text-white"
                  aria-label="Buka menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] bg-neutral-950 p-6">
                <div className="flex flex-col space-y-6 mt-6">
                  <div className="border-b border-white/10 pb-4">
                    <span className="font-mono text-base font-bold tracking-widest text-white border border-white px-2 py-0.5">
                      ZENORA
                    </span>
                  </div>

                  <nav className="flex flex-col space-y-2">
                    {NAV_LINKS.map((link) => {
                      const Icon = link.icon;
                      const isActive =
                        pathname === link.href ||
                        (link.matchPath !== "/" && pathname.startsWith(link.matchPath));
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
                            isActive
                              ? "bg-white text-black font-bold"
                              : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Quick Search Dialog */}
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
