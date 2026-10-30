import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RouteBodyClass } from "@/components/route-body-class";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slots Mania | Social Casino",
  description: "Play the games room and compete on the live leaderboards.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <RouteBodyClass />
        {children}
      </body>
    </html>
  );
}
