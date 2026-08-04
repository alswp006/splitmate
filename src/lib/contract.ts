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
