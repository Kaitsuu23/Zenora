# Mobile Responsiveness Audit — ZENORA Frontend

Scope: Next.js 15 (App Router) + TailwindCSS v4 client at `client/app` and `client/components`.
Stack confirmed from `client/package.json` (next 15.5.28, tailwindcss ^4, artplayer ^5.4.0, hls.js), `client/app/globals.css` (Tailwind v4 `@import "tailwindcss"`, `body { overflow-x: hidden }`), and `client/app/layout.tsx`. Build command: `npm run build` (`next build --turbopack`). All findings are read-only observations with recommended fixes; nothing is implemented.

---

## Summary answer

The layout shell (containers, grids, navbar/footer stacking, video grids) is **already mobile-responsive** — containers use `container mx-auto max-w-7xl px-4 sm:px-6`, the video grid is `grid-cols-2 sm:grid-cols-3 ... xl:grid-cols-6`, the player is a fluid `aspect-[16/9] w-full`, the navbar collapses to a `Sheet` drawer, and `body` sets `overflow-x: hidden`. No page produces horizontal scroll.

The real problems are **touch targets and micro-typography**, not layout breakage:

1. **Tap targets consistently under the 44px minimum** on the most-used mobile controls — server buttons (~28px), pagination buttons (32–36px), navbar search/menu (32px), mobile drawer links (~32px), drawer close (24px), browse tabs (~28px).
2. **Pervasive sub-12px text** (`text-[10px]`, `text-[11px]`) across watch metadata, badges, footer, and labels — below the `text-xs` (12px) floor on mobile.
3. **`no-scrollbar` is an undefined utility** — used in `browse-header.tsx` but never defined in CSS, so the intended hidden horizontal scrollbar on browse tabs silently does nothing and a visible scrollbar appears.
4. **Artplayer control bar** is configured with every optional control enabled (`pip`, `setting`, `playbackRate`, `fullscreen`, `fullscreenWeb`, `miniProgressBar`) with no mobile reduction, which crowds the bar on a narrow 16:9 viewport.

Files that are already fine: `app/page.tsx`, `app/watch/[id]/[slug]/page.tsx`, `components/video/video-card.tsx`, `components/video/video-grid.tsx` (responsive grids + fluid images). `components/navigation/footer.tsx` and `app/browse/[type]/[[...filters]]/page.tsx` are structurally fine with only minor text-size notes.

---

## Evidence by file

### 1. `app/page.tsx` — Home — ✅ Responsive
- Container `container mx-auto max-w-7xl px-4 sm:px-6 py-6` (line ~30, ~47). Good mobile padding.
- Carousel items `basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6` (lines ~62–64): two-up on mobile, scaling up. Good.
- Carousel nav arrows wrapped in `hidden md:block` (line ~70): hidden on mobile, users swipe via Embla (touch enabled by default). Good — `h-8 w-8` arrow buttons are desktop-only so their <44px size is not a mobile issue.
- No overflow risk; `CarouselContent` applies `overflow-hidden`.
- **No fixes required.**

### 2. `app/browse/[type]/[[...filters]]/page.tsx` — Browse — ⚠️ Minor (text size only)
- Container `container mx-auto max-w-7xl px-4 sm:px-6 py-8` (line ~84). Good.
- Title `<h1 className="text-xl md:text-2xl ... flex items-center gap-2">` (lines ~86–90): the label text lives in a child `<span>` that wraps internally; marker is a fixed `h-2 w-2` box. No horizontal overflow.
- Subtitle `text-xs` (line ~92): acceptable.
- `BrowseHeader`, `VideoGrid`, `PaginationBar` carry the actual responsive concerns — see their entries.
- **Fix (optional):** none structural. The page delegates to children.

### 3. `app/watch/[id]/[slug]/page.tsx` — Watch — ✅ Responsive (thin wrapper)
- Container `container mx-auto max-w-7xl px-4 sm:px-6 py-6` (line ~55). Renders `<WatchView>` only.
- **No fixes required** here; all responsive concerns live in `watch-view.tsx` and `video-player.tsx`.

### 4. `components/video/watch-view.tsx` — ⚠️ Touch target + text size
- Player is fluid and fine.
- Metadata panel `border ... bg-neutral-950 p-6 md:p-8 space-y-6` (line 45): on a 320–360px phone `p-6` (24px) leaves ~272–312px content width. Acceptable but tight; `p-4 sm:p-6 md:p-8` would breathe more.
- Title `<h1 className="text-lg md:text-2xl ... break-words">` (line 48): has `break-words`. Good.
- Info grid `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs` (line 64): responsive. Good.
- **Sub-12px labels:** `text-[11px]` repeats at lines 68, 76, 86, 101, 110, 131, 150, 171, 185 — all below the `text-xs` (12px) mobile floor. Section headers ("Tanggal Rilis:", "Studio:", "Genres:", "Tags:", "Aktris / Pemeran:", "Sinopsis & Catatan:") and the expand button are hard to read on small screens.
- Studio cell already has `flex-wrap` (line 75) and `shrink-0` icon (line 76): wraps correctly.
- Description `line-clamp-3` (lines ~178–182): fine.
- Expand button `text-[11px] ... pt-1` (line 185): ~28px tap height. Below 44px.
- Related grid `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4` (line ~177): responsive. Good.
- **Fixes:**
  - Bump section label spans from `text-[11px]` to `text-xs` (12px) for mobile legibility.
  - Enlarge the "Baca Selengkapnya/Tutup Ringkasan" button: add `min-h-[40px] py-2` (currently only `pt-1`).
  - (Optional) panel padding `p-4 sm:p-6 md:p-8`.

### 5. `components/player/video-player.tsx` — ⚠️ Control bar crowding + small retry button
- Viewport `relative aspect-[16/9] w-full bg-black overflow-hidden border ...` (line 320): fluid, `overflow-hidden` prevents bleed. Good.
- iframe fallback `h-full w-full` (line ~324): fine.
- Overlays `absolute inset-0 ... p-6 text-center` (loading/idle/error): fine.
- **Artplayer config (lines ~96–112):** every optional control is on — `pip: true` (98), `setting: true` (102), `playbackRate: true` (105), `fullscreen: true` (108), `fullscreenWeb: true` (108), `miniProgressBar: true` (110). No `controls` array or mobile-specific trim is passed. On a 360px-wide 16:9 player (~202px tall) the bottom bar crowds (play, time, flexible scrubber, then settings/playbackRate/pip/fullscreen/fullscreenWeb on the right). Artplayer auto-hides some controls on mobile, but `fullscreenWeb` + `pip` + `setting` + `playbackRate` together still crowd.
- **Retry button** `<Button variant="default" size="sm">` (line 379): `size="sm"` = `h-7` (28px) per `button.tsx`. Below 44px touch target.
- Keyboard shortcuts (F/space/arrows/M, lines ~155–195) are desktop-only — not a mobile concern.
- **Fixes:**
  - Reduce Artplayer controls on small screens, e.g. pass a `controls` array that omits `pip`/`fullscreenWeb` (or conditionally set `pip: false`, `fullscreenWeb: false`) for mobile; or keep them but accept crowding. At minimum, disable `fullscreenWeb` (rarely needed on mobile; true `fullscreen` already covers it).
  - Retry button: change `size="sm"` to `size="default"` (h-9) or add `min-h-[44px]`.

### 6. `components/player/server-selector.tsx` — ⚠️ Tap target too small (primary mobile control)
- Container `flex flex-col gap-2 border-t border-b ... py-3 my-4` (lines ~31–32). Good.
- Buttons `flex items-center gap-1.5 border px-3 py-1.5 text-xs ...` (line 47): text-xs (12px) + `py-1.5` (6px+6px) ≈ **~28px tall**. This is the core "pick a server" interaction on mobile and is well under the 44px minimum.
- Buttons wrap via `flex flex-wrap items-center gap-2` (line ~37): no overflow. Good.
- Tooltip on non-extract servers (lines ~56–60): tooltips don't fire on touch (no hover). The `canExtract` state is already visually distinguished by color, so this is a minor a11y note, not a blocker.
- **Fix:** raise button height to a real touch target: `px-3 py-2.5 min-h-[44px] text-xs` (or `min-h-[40px]`). Width stays auto via flex-wrap.

### 7. `components/navigation/navbar.tsx` — ⚠️ Multiple sub-44px tap targets
- Header `sticky top-0 z-50 ... h-14` (line ~46); inner `container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6` (line ~47). Good.
- Desktop nav `hidden md:flex ... absolute left-1/2 -translate-x-1/2` (line ~55): hidden on mobile. Good.
- **Search button** `size="sm" className="h-8 ... px-2.5"` (lines ~75–77): `h-8` = 32px. On mobile only the `Search` icon shows (`hidden sm:inline` text at line 81). 32px tap target.
- **Mobile menu trigger** `md:hidden h-8 w-8` (line 95): 32×32. Below 44px.
- **Mobile drawer links** `flex items-center gap-3 px-3 py-2 text-xs` (line 120): ≈ 32px row height. Below 44px.
- Drawer width `w-[280px]` (line ~104): fine on ≥320px screens (leaves a dismiss strip).
- **Fixes:**
  - Search button: `h-10 w-10` (or `min-h-[44px]`) on mobile, e.g. `h-10 w-10 sm:h-8 sm:w-auto`.
  - Menu trigger: `h-10 w-10` instead of `h-8 w-8`.
  - Drawer links: `py-3` (gives ~44px rows) instead of `py-2`.
  - Drawer close button (rendered by `sheet.tsx` line 64, `p-1` + `h-4 w-4` icon ≈ 24px): bump to `p-2` for ~36–40px, or add `min-h-[44px] min-w-[44px] flex items-center justify-center`.

### 8. `components/navigation/footer.tsx` — ✅ Responsive (minor text note)
- Top row `flex flex-col md:flex-row items-start md:items-center justify-between gap-6` (line ~10): stacks on mobile. Good.
- Links `flex flex-wrap gap-x-6 gap-y-2 text-xs` (line ~25): wraps. Good.
- Bottom row `flex flex-col sm:flex-row ... gap-4 text-[10px]` (line 39): `text-[10px]` is below the 12px floor, but it is legal/copyright copy — acceptable; optional bump to `text-[11px]`.
- Tagline `text-[11px]` (line 18): borderline; fine.
- **No structural fixes.** Optional: footer legal line `text-[10px]` → `text-[11px]`.

### 9. `components/video/video-card.tsx` — ✅ Responsive
- Article `flex flex-col bg-neutral-950/60 border` (line ~16): fluid in grid cell.
- Image link `aspect-[2/3] w-full overflow-hidden` (line ~21): fluid.
- `Image` `sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"` (line ~28): correct responsive `sizes`. Good.
- Title `text-xs ... line-clamp-2 break-words` (line ~85): 12px with clamp + break. Good.
- Overlay badges `text-[10px]` (lines 61, 70, 94): small but they are non-interactive overlays; acceptable.
- Hover play indicator `h-10 w-10` with `pointer-events-none` (lines ~55–59): decorative, not a tap target. Fine.
- Whole card is a link (image link + title link) → large tap target. Good.
- **No fixes required.**

### 10. `components/video/video-grid.tsx` — ✅ Responsive
- Grid `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4` (lines ~22, ~38): 2-up on mobile. Good.
- Skeleton uses the same grid (line ~22). Good.
- **No fixes required.**

### 11. `components/common/pagination-bar.tsx` — ⚠️ Tap targets + wrapping
- Container `my-10 flex justify-center` (line ~70). `PaginationContent` is `flex flex-wrap items-center gap-1` (`pagination.tsx` line ~18): **wraps on narrow screens** so no horizontal overflow — good.
- **`onPageChange` variant buttons:** page buttons `min-w-8 h-9 border px-3 text-xs` (line 104): `h-9` = 36px, `min-w-8` = 32px. Prev/Next `px-3 py-1.5 text-xs` (lines 78, 126): ≈ 28px. All below 44px.
- **Link variant** (the default path used by browse): `PaginationLink` uses `size="icon"` → `buttonVariants` icon = `h-8 w-8 p-0` (`button.tsx` line ~38), then `min-w-8` is re-applied (`pagination.tsx` line ~44). So link page buttons are a **fixed 32×32** box. Two concerns: (a) 32px < 44px tap target; (b) `w-8` is a *fixed* width, so multi-digit page numbers (e.g. `100`) are constrained to 32px — the `min-w-8` doesn't help because `w-8` caps it. Risk of visual clipping/cramping for 3-digit pages.
- Ellipsis `h-9 w-9` (`pagination.tsx` line ~76): not a target. Fine.
- **Fixes:**
  - Replace fixed `w-8` sizing for page links: in `pagination.tsx` `PaginationLink`, drop the `size="icon"` default (which forces `w-8 p-0`) and use `min-w-9 h-9 px-2` (or `min-w-[40px] min-h-[44px]` for true mobile targets).
  - `onPageChange` buttons: `min-h-[44px] min-w-[44px]` (or `py-2.5`) instead of `h-9`/`px-3 py-1.5`.

---

## Cross-cutting issues

### A. `no-scrollbar` is an undefined utility (affects browse tabs)
- `components/browse/browse-header.tsx` line 44 applies `overflow-x-auto ... no-scrollbar` to the 8 browse-type tabs (`BROWSE_TYPES`, `lib/constants.ts` lines ~7–17: Terbaru, Populer, Rilis Baru, Rating, Diskusi, Unduhan, Durasi, Ditonton). On mobile these overflow horizontally by design.
- A grep of all `*.css` files for `no-scrollbar`, `scrollbar-width`, and `::-webkit-scrollbar:horizontal` returns **no matches** — the class is never defined in `globals.css` or anywhere else. Tailwind v4 has no built-in `no-scrollbar`. So the scrollbar is **not hidden**; a visible horizontal scrollbar renders under the tabs on mobile.
- **Fix:** define the utility in `client/app/globals.css`:
  ```css
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  ```
  (or inline `[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]` on the element).

### B. Touch targets < 44px across primary controls
Aggregated (all below the WCAG 2.5.5 / Apple 44px guidance):
- `server-selector.tsx` line 47 — server buttons ~28px (the main mobile interaction).
- `pagination-bar.tsx` lines 78, 104, 126 — prev/next ~28px, page buttons 32–36px; link variant fixed 32px.
- `navbar.tsx` lines 77, 95, 120 — search 32px, menu trigger 32px, drawer links ~32px.
- `sheet.tsx` line 64 — drawer close ~24px.
- `video-player.tsx` line 379 — retry button 28px (`size="sm"`).
- `browse-header.tsx` line 52 — browse tabs ~28px.
- Shared `select.tsx` trigger `h-9` (36px) and `SelectItem` `py-1.5` (~24px) are also below 44px, though not in the audit list — worth noting since `PeriodSelect`/`OrderSelect` are used on mobile.

### C. Sub-12px text on mobile
- `watch-view.tsx`: `text-[11px]` at lines 68, 76, 86, 101, 110, 131, 150, 171, 185.
- `video-card.tsx`: `text-[10px]` overlays (lines 61, 70, 94) — acceptable as non-interactive badges.
- `footer.tsx`: `text-[10px]` (line 39), `text-[11px]` (line 18).
- `navbar.tsx`: `text-[11px]` search label (line 81), `text-[9px]` `⌘K` kbd (line ~85) — kbd is desktop-only (`hidden sm:inline`), not a mobile issue.
Recommendation: enforce `text-xs` (12px) as the mobile minimum for body/labels; reserve `text-[10px]`/`text-[11px]` for truly non-essential micro-labels.

### D. Viewport / notch
- `app/layout.tsx` exports `metadata` but **no `viewport`** (grep for `export const viewport` / `generateViewport` / `maximumScale` / `viewport-fit` → no matches). Next.js injects a default `width=device-width, initial-scale=1` so mobile rendering works, but there is no `viewport-fit=cover` for safe-area/notch handling and no explicit maximum-scale. Not a breakage; consider adding a `viewport` export if notch insets ever matter.

---

## Conclusions and recommendations (priority order)

1. **Define `.no-scrollbar`** in `globals.css` (or inline equivalent) — quick, fixes the visible scrollbar on browse tabs. Highest bang-for-buck.
2. **Enlarge server-selector buttons** to `min-h-[44px]` (`server-selector.tsx` line 47) — the single most-tapped mobile control.
3. **Fix pagination tap targets** and the fixed `w-8` link sizing (`pagination-bar.tsx` lines 78/104/126 + `pagination.tsx` PaginationLink) — bump to `min-w-[40px] min-h-[44px]` and drop `size="icon"`'s fixed `w-8`.
4. **Enlarge navbar mobile controls** — search button, menu trigger, drawer links, drawer close (navbar + sheet).
5. **Trim Artplayer controls on mobile** (`video-player.tsx` lines 96–112) — disable `pip`/`fullscreenWeb` or pass a custom `controls` array; also bump the retry button off `size="sm"`.
6. **Raise sub-12px labels to `text-xs`** in `watch-view.tsx` (and optionally footer legal text).
7. (Optional) Add a `viewport` export in `layout.tsx` with `viewport-fit=cover` for notch safety.

No code was modified. Verification of any fix would be `npm run build` (already passing per the build log in the task) plus a manual mobile-width (360–390px) browser check of `/`, `/browse/popular`, and `/watch/...`.
