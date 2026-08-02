# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
export interface Member {
  id: string;
  name: string;
}

export interface SplitItem {
  id: string;
  name: string;
  amount: number;
  payerId: string;
  memberIds: string[];
}

export interface SplitSession {
  id: string;
  title: string;
  members: Member[];
  items: SplitItem[];
  createdAt: string;
}

export interface SettlementResult {
  memberId: string;
  amount: number;
}

export type RouteState =
  | { screen: "home" }
  | { screen: "create" }
  | { screen: "result"; sessionId: string };

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  lib/
    storage.ts
    types.ts

### Exports (src/lib/)
- storage.ts: export type SaveResult =; export function getSessions(): SplitSession[]; export function getSession(id: string): SplitSession | null; export function saveSession(session: SplitSession): SaveResult
- types.ts: export interface Member; export interface SplitItem; export interface SplitSession; export interface SettlementResult; export type RouteState = |
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- heal-1-01: 엔티티 타입 + RouteState 계약 정의(최소 스켈레톤) (files: src/types.ts)