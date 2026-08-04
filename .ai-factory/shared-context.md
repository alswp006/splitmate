# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type Participant = { id: string; name: string };

export type Item = { id: string; name: string; amountKrw: number; paidBy: string; splitWith: string[] };

export type TransferResult = { from: string; to: string; amountKrw: number };

export type SplitResult = { id: string; createdAt: string; title: string; participants: Participant[]; transfers: TransferResult[] };

export type RouteState = { title?: string; participants?: Participant[]; items?: Item[] };

export type saveSplitResultFn = (result: SplitResult) => Promise<void>;

export type getSplitResultsFn = () => Promise<SplitResult[]>;

export type deleteSplitResultFn = (id: string) => Promise<void>;

export type calculateTransfersFn = (items: Item[], participants: Participant[]) => TransferResult[];

export type formatKrwFn = (amount: number) => string;

export type formatDateFn = (date: string) => string;

export type generateTossTransferUrlFn = (from: string, to: string, amountKrw: number) => string;

export type useHapticFn = () => () => void;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — SplitMate data models and routing contracts

/**
 * Split mode union: determines how participants share an expense
 * - 'even': split equally among all participants
 * - 'ratio': split by participant-specific ratio (e.g., 1:2:1)
 * - 'fixed': split by participant-specific fixed amount
 * - 'excluded': participant is excluded from this item (does not share)
 */
export type SplitMode = 'even' | 'ratio' | 'fixed' | 'excluded';

/**
 * Participant in a settlement
 */
export interface Participant {
  id: string;   // UUID
  name: string; // 1~10 chars, no spaces, unique within settlement
}

/**
 * Expense item in a settlement
 */
export interface SettlementItem {
  id: string;              // UUID
  label: string;           // 1~20 chars (e.g., "스테이크")
  amount: number;          // integer, 1 ~ 100,000,000 KRW
  participantIds: string[]; // must reference Participant.id values
}

/**
 * Split rule for a single participant — determines how they share each item
 */
export interface SplitRule {
  participantId: string; // references Participant.id
  mode: SplitMode;       // 'even' | 'ratio' | 'fixed' | 'excluded'
  value: number;         // mode='ratio' → ratio (>0), 'fixed' → amount (≥0), others ignored
}

/**
 * A single settlement event (trip, meal, etc.)
 *
 * Constraints:
 * - participants: 2~20 participants
 * - items: 0~50 expense items
 * - splitRules: one rule per participant (length === participants.length)
 */
export interface Settlement {
  id: string;                // UUID
  title: string;             // 1~20 chars
  participants: Participant[]; // length 2~20
  items: SettlementItem[];   // length 0~50
  splitRules: SplitRule[];   // length === participants.length
  createdAt: number;         // epoch milliseconds
  updatedAt: number;         // epoch milliseconds
}

/**
 * One participant's share of the total settlement (derived from calculation)
 */
export interface ParticipantShare {
  participantId: string; // references Participant.id
  name: string;          // copy of Participant.name for display
  amount: number;        // final burden amount in KRW (integer)
}

/**
 * Result of settlement calculation (not stored, computed from items + splitRules)
 */
export interface SettlementResult {
  total: number;           // sum of all item amounts
  shares: ParticipantShare[]; // per-participant share breakdown (sum === total)
}

/**
 * Result of a storage save operation
 */
export type SaveResult =
  | { ok: true; settlement: Settlement }
  | { ok: false; error: string };

/**
 * Page-specific navigation state — one key per route path
 *
 * Maps each route to its payload type:
 * - '/' (S1 Home): empty or showing recent settlements
 * - '/new' (S2 New): title input
 * - '/new/items' (S3 Items): add expenses
 * - '/new/split' (S4 Split): configure split rules
 * - '/result' (S5 Result): show calculation and transfer links
 */
export interface RouteState {
  '/': Record<string, never>; // empty object
  '/new': {
    titl
// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    OnboardingGate.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    ShareCard.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
    useHaptic.ts
  lib/
    calc.ts
    contract.ts
    format.ts
    shareImage.ts
    storage.ts
    transfer.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    Items.tsx
    NewSettlement.tsx
    Result.tsx
    Split.tsx
    __TdsGallery.tsx
    zzz-probe.ts
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts
  zzz-probe-mod.ts

### Exports (src/lib/)
- calc.ts: export type SplitMode = "even" | "ratio" | "fixed" | "excluded"; export interface SplitParticipant; export interface Share; export interface SettlementResult; export type CalculateSplitResult = |; export interface CalculateSplitInput; export function calculateSplit( input: CalculateSplitInput ): CalculateSplitResult
- contract.ts: export type Participant =; export type Item =; export type TransferResult =; export type SplitResult =; export type RouteState =; export type saveSplitResultFn = (result: SplitResult) => Promise<void>; export type getSplitResultsFn = () => Promise<SplitResult[]>; export type deleteSplitResultFn = (id: string) => Promise<void>
- format.ts: export function formatKRW(amount: number): string; export function parseKRW(formatted: string): number
- shareImage.ts: export function downloadResultImage(title: string, rows: ShareRow[]): boolean
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function saveSettlement(settlement: Settlement): SaveResult; export function getRecentSettlements(): Settlement[]; export function getSettlementById(id: string): Settlement | null; export function deleteSettlement(id: string):; export function getFlags(): Flags
- transfer.ts: export async function requestTransfer( amount: number, recipientName?: string ): Promise<boolean>
- types.ts: export type SplitMode = 'even' | 'ratio' | 'fixed' | 'excluded'; export interface Participant; export interface SettlementItem; export interface SplitRule; export interface Settlement; export interface ParticipantShare; export interface SettlementResult; export type SaveResult = |
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- OnboardingGate.tsx: OnboardingGate
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- ShareCard.tsx: ShareCard
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/storage.ts → imports: lib/types
  pages/Home.tsx → imports: components/ScreenScaffold, components/StateView, lib/format, lib/storage, lib/types
  pages/Items.tsx → imports: components/ScreenScaffold, components/BottomCTA, components/SummaryHero, components/Amount, lib/format, lib/types
  pages/NewSettlement.tsx → imports: components/ScreenScaffold, components/BottomCTA, lib/types
  pages/Result.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Card, components/Amount, components/CountUp, components/StateView, components/AdSlot, components/TossRewardAd, lib/storage, lib/calc, lib/transfer, lib/shareImage, lib/types
  pages/Split.tsx → imports: components/ScreenScaffold, components/BottomCTA, lib/calc, lib/storage, lib/format, lib/types
  pages/zzz-probe.ts → imports: lib/format
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 & RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: localStorage 저장 계층 (CRUD) (files: src/lib/storage.ts)
- 0003: 분할 계산 순수 함수 (files: src/lib/calc.ts)
- 0004: 통화 포맷 & 토스 송금 딥링크 유틸 (files: src/lib/format.ts, src/lib/transfer.ts)
- 0006: 기본 정보 입력 `/new` (제목·참여자) (files: src/pages/NewSettlement.tsx)
- 0007: 항목 입력 `/new/items` (금액·인원 지정) (files: src/pages/Items.tsx)
- 0008: 분할 설정 `/new/split` (계산 실행 + 저장) (files: src/pages/Split.tsx)
- 0011: 햅틱·공유 헬퍼 컴포넌트 + 최종 UX 폴리시 (files: src/hooks/useHaptic.ts, src/components/ShareCard.tsx)
- 0005: 홈 화면 `/` (최근 내역) (files: src/pages/Home.tsx)