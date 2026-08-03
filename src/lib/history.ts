interface PersonShare {
  name: string;
  amount: number;
}

export interface HistoryEntry {
  id: string;
  totalAmount: number;
  perPerson: PersonShare[];
  createdAt: string;
}

export function getHistoryList(
  entries: HistoryEntry[] | null | undefined
): HistoryEntry[] {
  return (entries ?? []).map((entry) => ({
    ...entry,
    perPerson: entry.perPerson ?? [],
  }));
}

export interface NightlyBatchResult {
  processedCount: number;
  totalAmount: number;
}

export function runNightlyBatch(
  entries: HistoryEntry[] | null | undefined
): NightlyBatchResult {
  const list = getHistoryList(entries);
  return list.reduce(
    (acc, entry) => ({
      processedCount: acc.processedCount + 1,
      totalAmount: acc.totalAmount + entry.totalAmount,
    }),
    { processedCount: 0, totalAmount: 0 }
  );
}
