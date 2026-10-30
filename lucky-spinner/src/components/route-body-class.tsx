"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const BODY_CLASS_BY_PATH: Record<string, string> = {
  "/": "landing-page",
  "/games": "games-page",
  "/games/slots": "slots-page",
  "/games/blackjack": "blackjack-page",
  "/games/roulette": "roulette-page",
  "/games/prize-wheel": "prize-page",
};

export function RouteBodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    body.classList.remove(
      "landing-page",
      "games-page",
      "slots-page",
      "blackjack-page",
      "roulette-page",
      "prize-page",
    );
    const className = BODY_CLASS_BY_PATH[pathname];
    if (className) body.classList.add(className);

    return () => {
      if (className) body.classList.remove(className);
    };
  }, [pathname]);

  return null;
}
