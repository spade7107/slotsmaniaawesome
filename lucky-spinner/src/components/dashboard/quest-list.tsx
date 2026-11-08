"use client";

import type { DashboardQuest } from "./types";

export function QuestList({
  quests,
  claimingId,
  onClaim,
}: {
  quests: DashboardQuest[];
  claimingId: string | null;
  onClaim: (quest: DashboardQuest) => void;
}) {
  if (quests.length === 0) {
    return <p className="text-sm leading-relaxed text-white/55">Daily quests are available when you sign in.</p>;
  }

  return (
    <div className="space-y-3">
      {quests.map((quest) => (
        <article key={quest.id} className="dashboard-frame dashboard-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white/90">{quest.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#a5b1c2]">{quest.description}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-[#f3cc70]/10 px-2 py-1 font-mono text-xs font-bold tabular-nums text-[#f3cc70]">
              +{quest.reward} GC
            </span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={`${quest.title} progress`}
            aria-valuemin={0}
            aria-valuemax={quest.target}
            aria-valuenow={quest.progress}
          >
            <div
              className="h-full rounded-full bg-[#67d8c6] transition-[width]"
              style={{ width: `${Math.min(quest.progress / quest.target, 1) * 100}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            {quest.claimed ? (
              <span className="dashboard-completed-state rounded-md px-2 py-1 text-xs font-bold">
                Claimed
              </span>
            ) : (
              <>
                <span className="font-mono text-xs font-semibold tabular-nums text-white/55">
                  {quest.progress}/{quest.target} rounds
                </span>
                <button
                  type="button"
                  disabled={!quest.claimable || claimingId === quest.id}
                  onClick={() => onClaim(quest)}
                  className="min-h-11 rounded-lg bg-[#67d8c6] px-3 text-xs font-black text-[#07151a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
                >
                  {claimingId === quest.id ? "Claiming…" : quest.claimable ? "Claim" : "In progress"}
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
