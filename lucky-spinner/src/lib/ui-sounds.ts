"use client";

let audioContext: AudioContext | null = null;

export function playUiSound(enabled: boolean, type: "click" | "confirm" = "click"): boolean {
  if (!enabled || typeof window === "undefined" || !window.AudioContext) return false;

  audioContext ??= new window.AudioContext();
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch((error: unknown) => {
      console.error("Could not resume dashboard audio", error);
    });
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startedAt = audioContext.currentTime;
  const duration = type === "confirm" ? 0.12 : 0.055;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(type === "confirm" ? 740 : 520, startedAt);
  if (type === "confirm") {
    oscillator.frequency.linearRampToValueAtTime(880, startedAt + duration);
  }
  gain.gain.setValueAtTime(0.001, startedAt);
  gain.gain.linearRampToValueAtTime(0.035, startedAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, startedAt + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startedAt);
  oscillator.stop(startedAt + duration);
  return true;
}
