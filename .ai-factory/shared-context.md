# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
export interface PersonShare {
  name: string;
  amount: number;
}

export interface ResultData {
  totalAmount: number;
  perPerson?: PersonShare[] | null;
}

export interface RouteState {
  result?: ResultData | null;
}

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  components/
    AdSlot.tsx
    __scratchDummy.tsx
  lib/
    history.ts
    toss-tds-mobile.d.ts
    types.ts
  pages/
    Result.tsx
  types/

### Exports (src/lib/)
- history.ts: export interface HistoryEntry; export function getHistoryList( entries: HistoryEntry[] | null | undefined ): HistoryEntry[]; export interface NightlyBatchResult; export function runNightlyBatch( entries: HistoryEntry[] | null | undefined ): NightlyBatchResult
- types.ts: export interface PersonShare; export interface ResultData; export interface RouteState

### Components (src/components/)
- AdSlot.tsx: AdSlot
- __scratchDummy.tsx: Dummy

### Module Dependencies (import graph)
  pages/Result.tsx → imports: components/AdSlot, lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- heal-1-02: 배열 렌더 지점 옵셔널 체이닝·기본값 방어 (files: src/pages/Result.tsx, src/lib/history.ts)
- heal-2-01: 누락 모듈 해상도 복구(의존성·경로·타입선언) (files: package.json, tsconfig.json, src/types/tds-mobile.d.ts, src/components/AdSlot.tsx)
- heal-1-01: 결과 상태 누락 가드 및 안전한 리다이렉트 추가 (files: src/pages/Result.tsx)