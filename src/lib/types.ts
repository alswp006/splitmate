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
