import type { Settlement, SaveResult } from "@/lib/types";

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

const RECENT_KEY = "splitmate:recent";
const FLAGS_KEY = "splitmate:flags";
const MAX_RECENT = 3;

interface Flags {
  onboarded: boolean;
}

const DEFAULT_FLAGS: Flags = { onboarded: false };

function readRecentRaw(): Settlement[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("invalid splitmate:recent shape");
    return parsed as Settlement[];
  } catch {
    try {
      localStorage.setItem(RECENT_KEY, "[]");
    } catch {
      // storage unavailable — nothing more we can do
    }
    return [];
  }
}

function readFlagsRaw(): Flags {
  try {
    const raw = localStorage.getItem(FLAGS_KEY);
    if (raw === null) return { ...DEFAULT_FLAGS };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error("invalid splitmate:flags shape");
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    try {
      localStorage.setItem(FLAGS_KEY, JSON.stringify(DEFAULT_FLAGS));
    } catch {
      // storage unavailable — nothing more we can do
    }
    return { ...DEFAULT_FLAGS };
  }
}

function isReferentiallyValid(settlement: Settlement): boolean {
  const participantIds = new Set(settlement.participants.map((p) => p.id));
  const itemsValid = settlement.items.every((item) =>
    item.participantIds.every((id) => participantIds.has(id))
  );
  const rulesValid = settlement.splitRules.every((rule) => participantIds.has(rule.participantId));
  return itemsValid && rulesValid;
}

export function saveSettlement(settlement: Settlement): SaveResult {
  if (!isReferentiallyValid(settlement)) {
    return { ok: false, error: "참여자 정보가 올바르지 않습니다" };
  }

  const next = [settlement, ...readRecentRaw().filter((s) => s.id !== settlement.id)]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RECENT);

  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    return { ok: false, error: "저장 공간이 부족합니다" };
  }

  return { ok: true, settlement };
}

export function getRecentSettlements(): Settlement[] {
  return readRecentRaw()
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RECENT);
}

export function getSettlementById(id: string): Settlement | null {
  return readRecentRaw().find((s) => s.id === id) ?? null;
}

export function deleteSettlement(id: string): { ok: true } | { ok: false; error: string } {
  const next = readRecentRaw().filter((s) => s.id !== id);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    return { ok: false, error: "저장 공간이 부족합니다" };
  }
  return { ok: true };
}

export function getFlags(): Flags {
  return readFlagsRaw();
}

export function setOnboarded(onboarded: boolean): void {
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify({ ...readFlagsRaw(), onboarded }));
  } catch {
    // storage unavailable — best-effort, ignore
  }
}
