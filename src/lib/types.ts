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
