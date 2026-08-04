// Stub for packet 0011 ShareCard component
// Implementation will follow after test suite passes (green phase)

import type { SettlementResult } from "@/lib/types";

export interface ShareCardProps {
  title: string;
  result: SettlementResult;
  testId?: string;
}

export function ShareCard(_props: ShareCardProps) {
  return null;
}
