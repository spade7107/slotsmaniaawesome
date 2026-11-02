"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "slotsmania:responsible-play";
const INACTIVITY_MS = 30 * 60 * 1_000;
const DEFAULT_REMINDER_MINUTES = 60;

type PersistedState = {
  elapsedSeconds: number;
  lastActiveAt: number;
  reminderMinutes: number;
  nextReminderAt: number;
  reminderOpen: boolean;
  breakMinutes: number;
  breakUntil: number | null;
};

type ResponsiblePlayContextValue = PersistedState & {
  breakSecondsRemaining: number;
  setReminderMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  startBreak: () => void;
  dismissReminder: () => void;
  dismissBreak: () => void;
};

const DEFAULT_STATE: PersistedState = {
  elapsedSeconds: 0,
  lastActiveAt: 0,
  reminderMinutes: DEFAULT_REMINDER_MINUTES,
  nextReminderAt: DEFAULT_REMINDER_MINUTES * 60,
  reminderOpen: false,
  breakMinutes: 15,
  breakUntil: null,
};

const ResponsiblePlayContext = createContext<ResponsiblePlayContextValue | null>(null);

function isReminderMinutes(value: unknown): value is number {
  return value === 30 || value === 45 || value === 60 || value === 90;
}

function isBreakMinutes(value: unknown): value is number {
  return value === 5 || value === 15 || value === 30;
}

function readState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_STATE;

    const saved = value as Partial<PersistedState>;
    return {
      elapsedSeconds: Number.isSafeInteger(saved.elapsedSeconds) && saved.elapsedSeconds! >= 0
        ? saved.elapsedSeconds!
        : DEFAULT_STATE.elapsedSeconds,
      lastActiveAt: Number.isSafeInteger(saved.lastActiveAt) && saved.lastActiveAt! >= 0
        ? saved.lastActiveAt!
        : DEFAULT_STATE.lastActiveAt,
      reminderMinutes: isReminderMinutes(saved.reminderMinutes)
        ? saved.reminderMinutes
        : DEFAULT_STATE.reminderMinutes,
      nextReminderAt: Number.isSafeInteger(saved.nextReminderAt) && saved.nextReminderAt! >= 0
        ? saved.nextReminderAt!
        : DEFAULT_STATE.nextReminderAt,
      reminderOpen: saved.reminderOpen === true,
      breakMinutes: isBreakMinutes(saved.breakMinutes)
        ? saved.breakMinutes
        : DEFAULT_STATE.breakMinutes,
      breakUntil: Number.isSafeInteger(saved.breakUntil) && saved.breakUntil! > 0
        ? saved.breakUntil!
        : null,
    };
  } catch (error) {
    console.error("Could not read responsible-play settings", error);
    return DEFAULT_STATE;
  }
}

function saveState(value: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.error("Could not save responsible-play settings", error);
  }
}

function isSessionRoute(pathname: string): boolean {
  return pathname === "/dashboard" ||
    pathname.startsWith("/games/") ||
    pathname === "/roulette" ||
    pathname === "/arcade";
}

export function ResponsiblePlayProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const stateRef = useRef<PersistedState>(DEFAULT_STATE);
  const tickCount = useRef(0);
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [now, setNow] = useState(0);
  const tracking = isSessionRoute(pathname);

  const update = useCallback((next: PersistedState) => {
    stateRef.current = next;
    setState(next);
    saveState(next);
  }, []);

  useEffect(() => {
    if (!tracking) return;

    const timer = window.setTimeout(() => {
      const currentTime = Date.now();
      const saved = readState();
      const expired = currentTime - saved.lastActiveAt > INACTIVITY_MS;
      const next = expired
        ? {
            ...saved,
            elapsedSeconds: 0,
            nextReminderAt: saved.reminderMinutes * 60,
            reminderOpen: false,
            breakUntil: null,
          }
        : saved;
      next.lastActiveAt = currentTime;
      update(next);
      setNow(currentTime);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      const latest = { ...stateRef.current, lastActiveAt: Date.now() };
      stateRef.current = latest;
      saveState(latest);
    };
  }, [tracking, update]);

  useEffect(() => {
    if (!tracking) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const currentTime = Date.now();
      const previous = stateRef.current;
      const expired = currentTime - previous.lastActiveAt > INACTIVITY_MS;
      const next = expired
        ? {
            ...previous,
            elapsedSeconds: 1,
            nextReminderAt: previous.reminderMinutes * 60,
            reminderOpen: false,
            breakUntil: null,
          }
        : { ...previous, elapsedSeconds: previous.elapsedSeconds + 1 };
      next.lastActiveAt = currentTime;
      if (!next.reminderOpen && next.elapsedSeconds >= next.nextReminderAt) {
        next.reminderOpen = true;
      }
      stateRef.current = next;
      setState(next);
      setNow(currentTime);
      tickCount.current += 1;
      if (tickCount.current % 10 === 0 || next.reminderOpen !== previous.reminderOpen) {
        saveState(next);
      }
    }, 1_000);

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const currentTime = Date.now();
      const previous = stateRef.current;
      if (currentTime - previous.lastActiveAt > INACTIVITY_MS) {
        update({
          ...previous,
          elapsedSeconds: 0,
          lastActiveAt: currentTime,
          nextReminderAt: previous.reminderMinutes * 60,
          reminderOpen: false,
          breakUntil: null,
        });
      } else {
        update({ ...previous, lastActiveAt: currentTime });
      }
      setNow(currentTime);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [tracking, update]);

  const setReminderMinutes = useCallback((minutes: number) => {
    if (!isReminderMinutes(minutes)) return;
    const previous = stateRef.current;
    update({
      ...previous,
      reminderMinutes: minutes,
      nextReminderAt: previous.elapsedSeconds + minutes * 60,
      reminderOpen: false,
    });
  }, [update]);

  const setBreakMinutes = useCallback((minutes: number) => {
    if (!isBreakMinutes(minutes)) return;
    update({ ...stateRef.current, breakMinutes: minutes });
  }, [update]);

  const startBreak = useCallback(() => {
    const previous = stateRef.current;
    update({
      ...previous,
      breakUntil: Date.now() + previous.breakMinutes * 60_000,
      reminderOpen: false,
    });
  }, [update]);

  const dismissReminder = useCallback(() => {
    const previous = stateRef.current;
    update({
      ...previous,
      reminderOpen: false,
      nextReminderAt: previous.elapsedSeconds + previous.reminderMinutes * 60,
    });
  }, [update]);

  const dismissBreak = useCallback(() => {
    update({ ...stateRef.current, breakUntil: null });
  }, [update]);

  return (
    <ResponsiblePlayContext.Provider
      value={{
        ...state,
        breakSecondsRemaining: state.breakUntil
          ? Math.max(0, Math.ceil((state.breakUntil - now) / 1_000))
          : 0,
        setReminderMinutes,
        setBreakMinutes,
        startBreak,
        dismissReminder,
        dismissBreak,
      }}
    >
      {children}
    </ResponsiblePlayContext.Provider>
  );
}

export function useResponsiblePlay(): ResponsiblePlayContextValue {
  const value = useContext(ResponsiblePlayContext);
  if (!value) {
    throw new Error("useResponsiblePlay must be used within ResponsiblePlayProvider");
  }
  return value;
}
