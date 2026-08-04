export type SplitMode = "even" | "ratio" | "fixed" | "excluded";

export interface SplitParticipant {
  id: string;
  name: string;
  mode: SplitMode;
  amount?: number;
}

export interface Share {
  participantId: string;
  amount: number;
}

export interface SettlementResult {
  total: number;
  shares: Share[];
}

export type CalculateSplitResult =
  | { ok: true; result: SettlementResult }
  | { ok: false; error: string };

export interface CalculateSplitInput {
  total: number;
  participants: SplitParticipant[];
}

export function calculateSplit(
  input: CalculateSplitInput
): CalculateSplitResult {
  const { total, participants } = input;

  const fixedSum = participants
    .filter((p) => p.mode === "fixed")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  if (fixedSum > total) {
    return { ok: false, error: "고정 금액 합이 총액을 초과했어요" };
  }

  const activeParticipants = participants.filter((p) => p.mode !== "excluded");
  if (activeParticipants.length === 0) {
    return { ok: false, error: "최소 1명은 정산에 포함되어야 해요" };
  }

  const splitTargets = participants.filter(
    (p) => p.mode === "even" || p.mode === "ratio"
  );
  const remaining = total - fixedSum;
  const totalWeight = splitTargets.reduce(
    (sum, p) => sum + (p.mode === "ratio" ? p.amount ?? 1 : 1),
    0
  );

  const flooredShares = new Map<string, number>();
  let flooredSum = 0;
  for (const p of splitTargets) {
    const weight = p.mode === "ratio" ? p.amount ?? 1 : 1;
    const raw = totalWeight > 0 ? (remaining * weight) / totalWeight : 0;
    const floored = Math.floor(raw);
    flooredShares.set(p.id, floored);
    flooredSum += floored;
  }
  const remainder = remaining - flooredSum;
  const firstTargetId = splitTargets[0]?.id;

  const shares: Share[] = participants.map((p) => {
    if (p.mode === "excluded") {
      return { participantId: p.id, amount: 0 };
    }
    if (p.mode === "fixed") {
      return { participantId: p.id, amount: p.amount ?? 0 };
    }
    const amount = (flooredShares.get(p.id) ?? 0) + (p.id === firstTargetId ? remainder : 0);
    return { participantId: p.id, amount };
  });

  return { ok: true, result: { total, shares } };
}
