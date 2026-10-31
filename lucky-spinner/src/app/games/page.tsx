import Image from "next/image";
import Link from "next/link";

const skillGames = [
  { href: "/games/blackjack", title: "Play Blackjack!", image: "/legacy-assets/black-jack-poker.svg", alt: "Blackjack" },
  { href: "/games/roulette", title: "Play Roulette!" },
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
      <main className="w-full max-w-[76rem] space-y-10">
        <section aria-labelledby="skill-games-heading">
          <div className="mb-5">
            <h2 id="skill-games-heading" className="text-2xl font-black text-[#fff7e5]">
              Skill-based games
            </h2>
            <p className="mt-1 text-sm text-white/55">
              Your choices and strategy shape how each round plays out.
            </p>
          </div>
          <div className="game-list">
            {skillGames.map((game) => (
              <Link className="game-card" href={game.href} key={game.href}>
                <figure>
                  {game.image && game.alt ? (
                    <Image className="game-image" src={game.image} alt={game.alt} width={240} height={240} />
                  ) : (
                    <div className="roulette-card-wheel" role="img" aria-label="European roulette wheel preview"><span>0</span></div>
                  )}
                  <figcaption>{game.title}</figcaption>
                </figure>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="rng-games-heading">
          <div className="mb-5">
            <h2 id="rng-games-heading" className="text-2xl font-black text-[#fff7e5]">
              RNG-based games
            </h2>
            <p className="mt-1 text-sm text-white/55">
              Results are determined by chance each time you play.
            </p>
          </div>
          <div className="game-list">
            <Link className="game-card" href="/games/slots">
              <figure>
                <Image className="game-image" src="/legacy-assets/slot.svg" alt="Slots" width={240} height={240} />
                <figcaption>Play Slots!</figcaption>
              </figure>
            </Link>
            <Link className="game-card" href="/games/prize-wheel">
              <figure>
                <div className="prize-card-wheel" role="img" aria-label="Prize wheel preview"><span>GO</span></div>
                <figcaption>Play Prize Wheel!</figcaption>
              </figure>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
