import Image from "next/image";
import Link from "next/link";

const games = [
  { href: "/games/blackjack", title: "Play Blackjack!", image: "/legacy-assets/black-jack-poker.svg", alt: "Blackjack" },
  { href: "/games/slots", title: "Play Slots!", image: "/legacy-assets/slot.svg", alt: "Slots" },
];

export default function GamesPage() {
  return (
    <>
      <header className="mb-[clamp(1.5rem,5vh,3rem)] flex w-full max-w-[76rem] flex-wrap items-center justify-between gap-4">
        <h1 className="games-heading !mb-0 text-left">Choose a game</h1>
        <nav className="flex items-center gap-2">
          <Link
            href="/shop"
            className="rounded-lg border border-[#f3cc70]/30 bg-[#f3cc70]/[0.07] px-4 py-2.5 text-sm font-bold text-[#f3cc70] transition hover:bg-[#f3cc70]/15"
          >
            Boost shop
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:border-[#67d8c6]/60 hover:bg-white/10"
          >
            ← Home
          </Link>
        </nav>
      </header>
      <main className="game-list">
        {games.map((game) => (
          <Link className="game-card" href={game.href} key={game.href}>
            <figure>
              <Image className="game-image" src={game.image} alt={game.alt} width={240} height={240} />
              <figcaption>{game.title}</figcaption>
            </figure>
          </Link>
        ))}
        <Link className="game-card" href="/games/roulette">
          <figure>
            <div className="roulette-card-wheel" role="img" aria-label="European roulette wheel preview"><span>0</span></div>
            <figcaption>Play Roulette!</figcaption>
          </figure>
        </Link>
        <Link className="game-card" href="/games/prize-wheel">
          <figure>
            <div className="prize-card-wheel" role="img" aria-label="Prize wheel preview"><span>GO</span></div>
            <figcaption>Play Prize Wheel!</figcaption>
          </figure>
        </Link>
      </main>
    </>
  );
}
