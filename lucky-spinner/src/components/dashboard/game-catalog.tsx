"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, Search, X } from "lucide-react";
import { DashboardModal } from "./modal";

export type DashboardGame = {
  id: string;
  title: string;
  category: "slots" | "table" | "other";
  href: string;
  description: string;
  image?: string;
  imageAlt?: string;
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
    image: "/legacy-assets/slot.svg",
    imageAlt: "Slots game artwork",
    boostEligible: true,
  },
  {
    id: "blackjack",
    title: "Blackjack",
    category: "table",
    href: "/games/blackjack",
    description: "Choose when to hit or stand against the dealer.",
    image: "/legacy-assets/black-jack-poker.svg",
    imageAlt: "Blackjack game artwork",
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

function GameArtwork({ game, showBoostBadge = false }: { game: DashboardGame; showBoostBadge?: boolean }) {
  const [loaded, setLoaded] = useState(!game.image);

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,#17263a,#0e1725)]">
      {game.image ? (
        <>
          {!loaded && (
            <div
              aria-hidden="true"
              className="absolute inset-0 animate-pulse bg-white/[0.06]"
            />
          )}
          <Image
            src={game.image}
            alt={game.imageAlt ?? ""}
            fill
            sizes="(max-width: 767px) 90vw, (max-width: 1199px) 40vw, 25vw"
            className={`object-contain p-6 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className={`absolute inset-0 grid place-items-center ${game.wheel === "roulette" ? "bg-[repeating-conic-gradient(#101720_0deg_9.73deg,#b6414d_9.73deg_19.46deg)]" : "bg-[repeating-conic-gradient(#2a9d8f_0deg_30deg,#bd434b_30deg_60deg,#3584a5_60deg_90deg,#d7a643_90deg_120deg)]"}`}
        >
          <span className="grid aspect-square w-16 place-items-center rounded-full border-4 border-[#f3cc70] bg-[#101827] text-2xl font-black text-[#f3cc70] shadow-xl">
            {game.wheel === "roulette" ? "0" : "GO"}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#09111d] to-transparent" />
      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
        <h3 className="text-xl font-black text-white drop-shadow-lg">{game.title}</h3>
        {showBoostBadge && game.boostEligible && (
          <span className="rounded-full border border-[#f3cc70]/25 bg-[#111827]/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#f3cc70]">
            Boost eligible
          </span>
        )}
      </div>
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
          <h2 id="games-heading" className="mt-1 text-2xl font-black text-[#fff7e5] sm:text-3xl">
            Game room
          </h2>
        </div>
        <label className="relative min-w-[min(100%,14rem)] flex-1 sm:max-w-xs">
          <span className="sr-only">Search games</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search games"
            className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111b2b] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#67d8c6]/60"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="dashboard-filter-scroll flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCategory(item.id);
                if (soundEnabled) onSound();
              }}
              aria-pressed={category === item.id}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold transition ${category === item.id ? "border-[#67d8c6]/50 bg-[#67d8c6] text-[#07151a]" : "border-white/10 bg-white/[0.035] text-white/65 hover:border-white/25 hover:text-white"}`}
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
            className="min-h-11 rounded-xl border border-white/10 bg-[#111b2b] px-3 text-xs font-bold text-white outline-none focus:border-[#67d8c6]/60"
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
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibleGames.map((game) => {
            const isFavorite = favorites.includes(game.id);
            return (
              <article
                key={game.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#101a29]/90 p-3 transition duration-200 hover:border-[#67d8c6]/45 hover:bg-[#132033] hover:shadow-[0_20px_55px_rgba(0,0,0,0.28)] motion-safe:hover:scale-[1.05]"
              >
                <GameArtwork game={game} showBoostBadge={authenticated} />
                <p className="px-1 pb-1 pt-3 text-sm leading-relaxed text-white/55">
                  {game.description}
                </p>
                <button
                  type="button"
                  aria-label={`${isFavorite ? "Remove" : "Add"} ${game.title} ${isFavorite ? "from" : "to"} favorites`}
                  aria-pressed={isFavorite}
                  onClick={() => toggleFavorite(game.id)}
                  className="absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-[#09111d]/85 text-white/70 backdrop-blur transition hover:border-pink-300/50 hover:text-pink-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d8c6]"
                >
                  <Heart aria-hidden="true" className={`h-5 w-5 ${isFavorite ? "fill-pink-400 text-pink-400" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGame(game)}
                  className="absolute inset-x-3 bottom-14 top-3 z-[1] rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d8c6] md:hidden"
                  aria-label={`View ${game.title} details`}
                />
                <Link
                  href={game.href}
                  onClick={() => {
                    if (soundEnabled) onSound();
                  }}
                  className="absolute bottom-[4.75rem] left-6 right-6 hidden min-h-11 translate-y-2 items-center justify-center rounded-xl bg-[#67d8c6] px-4 text-sm font-black text-[#07151a] opacity-0 shadow-lg transition duration-200 hover:brightness-110 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white group-hover:translate-y-0 group-hover:opacity-100 md:flex"
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
