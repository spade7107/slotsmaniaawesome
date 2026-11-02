"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

export type PromoSlide = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
};

export function PromoCarousel({ slides }: { slides: PromoSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 7_000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[activeIndex % slides.length];
  return (
    <section aria-label="Featured promotion" className="relative aspect-[21/9] min-h-52 overflow-hidden rounded-3xl border border-white/10 sm:aspect-[16/7]">
      <Image
        src={slide.image}
        alt={slide.imageAlt}
        fill
        priority
        sizes="(max-width: 767px) 100vw, 75vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#08111c] via-[#08111c]/80 to-transparent" />
      <div className="relative z-10 max-w-xl p-6 sm:p-9">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#67d8c6]">Featured</p>
        <h2 className="mt-2 text-2xl font-black text-[#fff7e5] sm:text-4xl">{slide.title}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
          {slide.description}
        </p>
        <Link
          href={slide.href}
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#67d8c6] px-5 text-sm font-black text-[#07151a]"
        >
          Explore now
        </Link>
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 sm:bottom-6 sm:right-6">
          <div className="flex items-center gap-1.5" aria-label="Promotion slides">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show promotion ${index + 1}`}
                aria-current={activeIndex === index}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${activeIndex === index ? "w-6 bg-[#67d8c6]" : "w-2.5 bg-white/45 hover:bg-white/75"}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label={paused ? "Play promotion carousel" : "Pause promotion carousel"}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/35 text-white hover:bg-black/60"
          >
            {paused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      )}
    </section>
  );
}
