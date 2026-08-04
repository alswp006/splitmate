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
    title?: string;
  };
  '/new/items': {
    title?: string;
    participants?: Participant[];
    items?: SettlementItem[];
  };
  '/new/split': {
    title?: string;
    participants?: Participant[];
    items?: SettlementItem[];
    splitRules?: SplitRule[];
  };
  '/result': {
    settlementId?: string;
    result?: SettlementResult;
  };
}
