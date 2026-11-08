import type { Metadata } from "next";
import AlchemistsCrucible from "@/components/alchemists-crucible/App";
import "./crucible.css";

export const metadata: Metadata = {
  title: "Alchemist's Crucible | Slots Mania",
  description: "Play the 5x3 Alchemist's Crucible demo slot with expanding wilds and free spins.",
};

export default function AlchemistsCruciblePage() {
  return <AlchemistsCrucible />;
}
