import type { SplitSession } from "./types";

const STORAGE_KEY = "splitmate:sessions";
const MAX_SESSIONS = 3;

export type SaveResult = { ok: true } | { ok: false; error: string };

function isValidSession(value: unknown): value is SplitSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return typeof s.id === "string";
}

function readSessions(): SplitSession[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidSession)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function getSessions(): SplitSession[] {
  return readSessions();
}

export function getSession(id: string): SplitSession | null {
  return readSessions().find((session) => session.id === id) ?? null;
}

export function saveSession(session: SplitSession): SaveResult {
  const sessions = readSessions();
  sessions.push(session);

  while (sessions.length > MAX_SESSIONS) {
    let oldestIndex = 0;
    for (let i = 1; i < sessions.length; i++) {
      if (Number(sessions[i].createdAt) < Number(sessions[oldestIndex].createdAt)) {
        oldestIndex = i;
      }
    }
    sessions.splice(oldestIndex, 1);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return { ok: true };
  } catch {
    return { ok: false, error: "저장 공간이 부족합니다" };
  }
}
