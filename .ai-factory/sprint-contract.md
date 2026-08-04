# Sprint Contract — Packet 0005: Haptic & Share Helper Components

## 패킷 목표
도메인 헬퍼 파일(useHaptic) + 공유 기능 표시 컴포넌트(ShareCard)를 제공하여 F6-F7 결과 화면의 UX 폴리시를 additive하게 지원한다. App.tsx/main.tsx 진입점 수정 금지.

## 생성할 파일

| 파일 | 책임 | 상세 |
|------|------|------|
| `src/hooks/useHaptic.ts` | 햅틱 래퍼 | generateHapticFeedback 예외 가드 + try/catch 래핑 |
| `src/components/ShareCard.tsx` | 공유 카드 UI | 참여자별 share 렌더 + 송금/공유 액션 버튼(TDS) |

## 사용할 타입 (types.ts import 필수)
- `ParticipantShare` — participantId, name, amount
- `SettlementResult` — total, shares[]
- `RouteState` — 타입 안전 라우팅

## 검증 방법
1. `pnpm typecheck` — 타입 에러 0
2. `pnpm test` — F6/F7 테스트 통과
3. `npx next build` — 빌드 성공
4. 임포트 검증 — types.ts 타입 참조 확인

## 절대 금지 사항
- ❌ App.tsx, main.tsx, _app.tsx 수정
- ❌ localStorage 로직 추가 (F2 소유)
- ❌ 계산 로직 추가 (F5 소유)
- ❌ SDK 예외 처리 없이 직접 호출
- ❌ 임포트 없이 types 재정의
