import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/games.html", destination: "/games", permanent: true },
      { source: "/mvp.html", destination: "/games/slots", permanent: true },
      { source: "/blackjack.html", destination: "/games/blackjack", permanent: true },
      { source: "/roulette.html", destination: "/games/roulette", permanent: true },
      { source: "/prize-wheel.html", destination: "/games/prize-wheel", permanent: true },
      { source: "/lucky-spinner", destination: "/roulette", permanent: true },
      { source: "/lucky-spinner/arcade", destination: "/arcade", permanent: true },
      { source: "/lucky-spinner/leaderboards", destination: "/leaderboards", permanent: true },
      { source: "/lucky-spinner/login", destination: "/login", permanent: true },
      { source: "/lucky-spinner/signup", destination: "/signup", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
