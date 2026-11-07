"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Search, X } from "lucide-react";
import { DashboardModal } from "./modal";

export type DashboardGame = {
  id: string;
  title: string;
  category: "slots" | "table" | "other";
  href: string;
  description: string;
  wheel?: "roulette" | "prize";
  boostEligible: boolean;
};

export const DASHBOARD_GAMES: DashboardGame[] = [
  {
    id: "slots",
    title: "Slots",
    category: "slots",
    href: "/games/slots",
    description: "Spin the reels and play the paylines.",
    boostEligible: true,
  },
  {
    id: "blackjack",
    title: "Blackjack",
    category: "table",
    href: "/games/blackjack",
    description: "Choose when to hit or stand against the dealer.",
    boostEligible: false,
  },
  {
    id: "roulette",
    title: "Roulette",
    category: "table",
    href: "/games/roulette",
    description: "Place chips on a European roulette wheel.",
    wheel: "roulette",
    boostEligible: false,
  },
  {
    id: "prize-wheel",
    title: "Prize Wheel",
    category: "other",
    href: "/games/prize-wheel",
    description: "Spin for a multiplier or a miss.",
    wheel: "prize",
    boostEligible: true,
  },
];

type Category = "all" | "slots" | "table" | "favorites" | "boosted";
type Sort = "popular" | "name";

function GameArtwork({
  game,
  showBoostBadge = false,
  className,
}: {
  game: DashboardGame;
  showBoostBadge?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(145deg,#17263a,#0e1725)] ${className ?? "aspect-video rounded-xl border border-white/10"}`}
    >
      <svg viewBox="0 0 320 180" className="h-full w-full" fill="none" aria-hidden="true">
        <rect width="320" height="180" fill="#111b2b" />
        <path d="M0 148H320" stroke="#26364a" strokeWidth="2" />
        {game.id === "slots" ? (
          <g strokeWidth="2">
            <rect x="48" y="35" width="224" height="110" rx="12" fill="#17283c" stroke="#67d8c6" />
            {[0, 1, 2, 3, 4].map((column) => (
              <g key={column}>
                <rect x={58 + column * 42} y="45" width="34" height="90" rx="5" fill="#0d1117" stroke="#40536a" />
                <text x={75 + column * 42} y="84" textAnchor="middle" fill="#f3cc70" fontSize="22" fontWeight="700">
                  {["7", "◈", "7", "✦", "7"][column]}
                </text>
                <circle cx={75 + column * 42} cy="112" r="5" fill="#67d8c6" />
              </g>
            ))}
            <path d="M58 90H260" stroke="#f3cc70" strokeWidth="2" />
          </g>
        ) : game.id === "blackjack" ? (
          <g strokeWidth="2">
            <rect x="93" y="32" width="84" height="116" rx="9" transform="rotate(-12 93 32)" fill="#f3f6fb" stroke="#a5b1c2" />
            <rect x="146" y="35" width="84" height="116" rx="9" transform="rotate(10 146 35)" fill="#f3f6fb" stroke="#a5b1c2" />
            <text x="113" y="64" fill="#172235" fontSize="24" fontWeight="700">A</text>
            <path d="M121 71c-9-10-19 2 0 16 19-14 9-26 0-16Z" fill="#67d8c6" stroke="#67d8c6" />
            <text x="190" y="68" fill="#172235" fontSize="24" fontWeight="700">K</text>
            <path d="m205 78 11 11-11 11-11-11 11-11Z" fill="#f3cc70" stroke="#f3cc70" />
          </g>
        ) : game.wheel === "roulette" ? (
          <g strokeWidth="2">
            <circle cx="160" cy="90" r="63" fill="#17283c" stroke="#f3cc70" />
            <circle cx="160" cy="90" r="50" fill="#0d1117" stroke="#a5b1c2" />
            {[0, 45, 90, 135].map((rotation) => (
              <path key={rotation} d="M160 40V140" stroke="#67d8c6" transform={`rotate(${rotation} 160 90)`} />
            ))}
            <circle cx="160" cy="90" r="22" fill="#17283c" stroke="#f3cc70" />
            <circle cx="160" cy="90" r="7" fill="#f3cc70" stroke="#f3cc70" />
            <circle cx="160" cy="31" r="5" fill="#f3f6fb" stroke="#f3f6fb" />
            <path d="m152 17 8-12 8 12Z" fill="#f3cc70" stroke="#f3cc70" />
          </g>
        ) : (
          <g strokeWidth="2">
            <circle cx="160" cy="91" r="63" fill="#17283c" stroke="#f3cc70" />
            <path d="M160 91V28A63 63 0 0 1 214.6 59.5Z" fill="#67d8c6" stroke="#0d1117" />
            <path d="M160 91 214.6 59.5A63 63 0 0 1 214.6 122.5Z" fill="#2a9d8f" stroke="#0d1117" />
            <path d="M160 91 214.6 122.5A63 63 0 0 1 160 154Z" fill="#f3cc70" stroke="#0d1117" />
            <path d="M160 91 160 154A63 63 0 0 1 105.4 122.5Z" fill="#355b63" stroke="#0d1117" />
            <path d="M160 91 105.4 122.5A63 63 0 0 1 105.4 59.5Z" fill="#b8954f" stroke="#0d1117" />
            <path d="M160 91 105.4 59.5A63 63 0 0 1 160 28Z" fill="#3c9c91" stroke="#0d1117" />
            <circle cx="160" cy="91" r="15" fill="#0d1117" stroke="#f3f6fb" />
            <path d="m149 18 11-14 11 14Z" fill="#f3f6fb" stroke="#f3f6fb" />
          </g>
        )}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0d1117] to-transparent" />
      {showBoostBadge && game.boostEligible && (
        <span className="absolute right-4 top-4 z-[3] inline-flex h-6 items-center rounded-full border border-[#67d8c6]/40 bg-[#0d1117]/95 px-2.5 text-[11px] font-bold text-[#67d8c6]">
            Boost eligible
        </span>
      )}
    </div>
  );
}

export function GameCatalog({
  popularGames,
  authenticated,
  soundEnabled,
  onSound,
}: {
  popularGames: Record<string, number>;
  authenticated: boolean;
  soundEnabled: boolean;
  onSound: () => void;
}) {
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<DashboardGame | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (event.key.toLocaleLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable || target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
      )) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("slotsmania:favorite-games");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
            setFavorites(parsed.filter((id) => DASHBOARD_GAMES.some((game) => game.id === id)));
          }
        }
      } catch (error) {
        console.error("Could not read favorite games", error);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleGames = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = DASHBOARD_GAMES.filter((game) => {
      if (category === "slots" && game.category !== "slots") return false;
      if (category === "table" && game.category !== "table") return false;
      if (category === "favorites" && !favorites.includes(game.id)) return false;
      if (category === "boosted" && (!authenticated || !game.boostEligible)) return false;
      return !query || game.title.toLocaleLowerCase().includes(query);
    });

    return filtered.sort((left, right) => {
      if (sort === "name") return left.title.localeCompare(right.title);
      return (popularGames[right.id] ?? 0) - (popularGames[left.id] ?? 0) ||
        DASHBOARD_GAMES.indexOf(left) - DASHBOARD_GAMES.indexOf(right);
    });
  }, [authenticated, category, favorites, popularGames, search, sort]);

  const toggleFavorite = (gameId: string) => {
    const next = favorites.includes(gameId)
      ? favorites.filter((id) => id !== gameId)
      : [...favorites, gameId];
    setFavorites(next);
    try {
      window.localStorage.setItem("slotsmania:favorite-games", JSON.stringify(next));
    } catch (error) {
      console.error("Could not save favorite games", error);
    }
    if (soundEnabled) onSound();
  };

  const categories: { id: Category; label: string }[] = [
    { id: "all", label: "All games" },
    { id: "slots", label: "Slots" },
    { id: "table", label: "Table games" },
    { id: "favorites", label: "Favorites" },
    ...(authenticated ? [{ id: "boosted" as const, label: "Boost eligible" }] : []),
  ];

  return (
    <section id="games" aria-labelledby="games-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#67d8c6]">
            Find your next game
          </p>
          <h2 id="games-heading" className="dashboard-game-heading mt-1 text-[#fff7e5]">
            Game room
          </h2>
        </div>
        <label className="relative min-w-[min(100%,14rem)] flex-1 sm:max-w-xs">
          <span className="sr-only">Search games</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search games"
            className="dashboard-frame dashboard-surface min-h-11 w-full py-2 pl-10 pr-16 text-sm text-white outline-none transition placeholder:text-white/55 focus:border-[#67d8c6]/70 focus:ring-2 focus:ring-[#67d8c6]/25"
          />
          <kbd aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/55">
            Ctrl K
          </kbd>
        </label>
      </div>

      <div className="dashboard-catalog-controls mt-5 flex flex-wrap items-center gap-3">
        <div className="dashboard-filter-scroll flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCategory(item.id);
                if (soundEnabled) onSound();
              }}
              aria-pressed={category === item.id}
              className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${category === item.id ? "border-[#67d8c6]/50 bg-[#67d8c6] text-[#07151a]" : "border-white/10 bg-white/[0.035] text-white/65 hover:border-white/25 hover:text-white"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold text-white/55">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value === "name" ? "name" : "popular")}
            className="dashboard-frame dashboard-surface min-h-11 px-3 text-xs font-bold text-white outline-none focus:border-[#67d8c6]/70 focus:ring-2 focus:ring-[#67d8c6]/25"
          >
            <option value="popular">Popular</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      {visibleGames.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-12 text-center">
          <p className="font-bold text-white/80">No games found</p>
          <p className="mt-1 text-sm text-white/45">
            {category === "favorites" ? "Favorite a game to keep it here." : "Try another search or category."}
          </p>
        </div>
      ) : (
        <div className="dashboard-game-grid mt-3">
          {visibleGames.map((game) => {
            const isFavorite = favorites.includes(game.id);
            return (
              <article
                key={game.id}
                className="dashboard-frame group relative aspect-video overflow-hidden bg-[#101a29]/90 transition duration-200 hover:border-[#67d8c6]/45 hover:bg-[#132033] hover:shadow-[0_20px_55px_rgba(0,0,0,0.28)]"
              >
                <div className="dashboard-game-artwork absolute inset-0 z-0">
                  <GameArtwork game={game} showBoostBadge={authenticated} className="absolute inset-0 h-full w-full" />
                </div>
                <div className="dashboard-game-copy pointer-events-none absolute z-[1]">
                  <h3 className="font-bold text-white">{game.title}</h3>
                  <p className="dashboard-game-description mt-1 line-clamp-2">{game.description}</p>
                </div>
                <button
                  type="button"
                  aria-label={`${isFavorite ? "Remove" : "Add"} ${game.title} ${isFavorite ? "from" : "to"} favorites`}
                  aria-pressed={isFavorite}
                  onClick={() => toggleFavorite(game.id)}
                  className="absolute left-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#0d1117]/90 text-white/80 backdrop-blur transition hover:border-[#67d8c6]/60 hover:text-[#67d8c6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d8c6]"
                >
                  <Heart aria-hidden="true" className={`h-5 w-5 ${isFavorite ? "fill-[#67d8c6] stroke-[#67d8c6]" : "fill-none stroke-white"}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGame(game)}
                  className="absolute inset-4 z-[2] rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d8c6] md:hidden"
                  aria-label={`View ${game.title} details`}
                />
                <Link
                  href={game.href}
                  onClick={() => {
                    if (soundEnabled) onSound();
                  }}
                  className="absolute left-4 right-4 top-1/2 z-[2] hidden min-h-11 -translate-y-1/2 items-center justify-center rounded-xl bg-[#67d8c6] px-4 text-sm font-bold text-[#07151a] opacity-0 shadow-lg transition-opacity duration-200 hover:brightness-110 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white group-hover:opacity-100 md:flex"
                >
                  Play now
                </Link>
              </article>
            );
          })}
        </div>
      )}

      <DashboardModal
        open={Boolean(selectedGame)}
        onClose={() => setSelectedGame(null)}
        className="dashboard-sheet"
      >
        {selectedGame && (
          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[#fff7e5]">{selectedGame.title}</h2>
              <button
                type="button"
                aria-label="Close game details"
                onClick={() => setSelectedGame(null)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-white/65 hover:bg-white/10"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <GameArtwork game={selectedGame} showBoostBadge={authenticated} />
            <p className="mt-4 text-sm leading-relaxed text-white/65">{selectedGame.description}</p>
            {authenticated && selectedGame.boostEligible && (
              <p className="mt-3 rounded-lg border border-[#f3cc70]/20 bg-[#f3cc70]/[0.06] px-3 py-2 text-xs font-semibold text-[#f3cc70]">
                Eligible for your active play-count boost.
              </p>
            )}
            <Link
              href={selectedGame.href}
              onClick={() => {
                setSelectedGame(null);
                if (soundEnabled) onSound();
              }}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#67d8c6] px-5 font-black text-[#07151a] transition hover:brightness-110"
            >
              Play now
            </Link>
          </div>
        )}
      </DashboardModal>
    </section>
  );
}
