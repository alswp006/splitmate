// Stub for packet 0003 calculateSplit function
// Implementation will follow after test suite passes

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
  // Stub - to be implemented in packet 0003 green phase
  return {
    ok: false,
    error: "Not implemented",
  } as CalculateSplitResult;
}
