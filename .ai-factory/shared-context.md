# Shared Context (auto-generated — do NOT modify)


## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  lib/
    history.ts
  pages/
    Result.tsx

### Exports (src/lib/)
- history.ts: export interface HistoryEntry; export function getHistoryList( entries: HistoryEntry[] | null | undefined ): HistoryEntry[]; export interface NightlyBatchResult; export function runNightlyBatch( entries: HistoryEntry[] | null | undefined ): NightlyBatchResult

### Module Dependencies (import graph)
  pages/Result.tsx → imports: components/AdSlot
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.