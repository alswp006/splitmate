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

/** 정산 참여자 (구현: 패킷 0001) */
export type Person = { id: string; name: string };

/** 지출 항목 (누가 냈고, 누가 쓸 것인가) (구현: 패킷 0001) */
export type Item = { id: string; description?: string; amount: number; paidBy: string; splitAmong: string[] };

/** 한 번의 정산 이벤트 (구현: 패킷 0001) */
export type Settlement = { id: string; title: string; date: string; items: Item[]; participants: Person[] };

/** 정산 결과 (누가 누구에게 얼마를 돌려주는가) (구현: 패킷 0001) */
export type SettlementResult = { from: string; to: string; amount: number };

/** 라우팅 상태 + 임시 입력 데이터 (구현: 패킷 0001) */
export type RouteState = { screen: 'home' | 'new' | 'items' | 'split' | 'result'; settlementId?: string; tempSettlement?: Partial<Settlement> };

/** 정산 내역 저장 (구현: 패킷 0002) */
export type saveSettlementFn = (settlement: Settlement) => void;

/** ID로 정산 내역 조회 (구현: 패킷 0002) */
export type getSettlementFn = (id: string) => Settlement | null;

/** 저장된 모든 정산 내역 조회 (구현: 패킷 0002) */
export type listSettlementsFn = () => Settlement[];

/** 지출 항목과 참여자 목록으로 정산 결과 계산 (순수함수) (구현: 패킷 0003) */
export type calculateSettlementFn = (items: Item[], participants: Person[]) => SettlementResult[];

/** 원화 금액 표시 (예: 1,000,000₩) (구현: 패킷 0004) */
export type formatKRWFn = (amount: number) => string;

/** 송금 딥링크 (토스/카카오페이) 생성 (구현: 패킷 0004) */
export type generateTransferLinkFn = (fromPersonId: string, toPersonId: string, amount: number) => string;

/** 햅틱 피드백 훅 (구현: 패킷 0011) */
export type useHapticFn = () => { trigger: () => void };

/** 공유 카드 컴포넌트 props (구현: 패킷 0011) */
export type ShareCardProps = { settlement: Settlement; results: SettlementResult[]; onShare?: () => void };

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — add your app-specific types here
export {};

```