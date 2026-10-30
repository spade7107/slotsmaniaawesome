import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-content">
      <h1 className="brand-title">
        <Image
          src="/legacy-assets/logo4.png"
          alt="Gambling Mania"
          width={1200}
          height={500}
          priority
        />
      </h1>
      <Link className="play-button" href="/games">
        Try our games <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
