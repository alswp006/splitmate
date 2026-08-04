# Sprint Contract — 라우팅 배선 · 온보딩 게이트 · 검수 컴플라이언스

## 패킷 목표
react-router-dom으로 5개 화면(/, /new, /new/items, /new/split, /result) 배선하고, App 레벨에서 getFlags() 기반 OnboardingGate를 실행하여 첫 실행 시 안내 다이얼로그 1회 표시 후 setOnboarded 저장.

## 생성/수정 파일

| 파일 | 책임 | 상세 |
|------|------|------|
| `src/App.tsx` | 라우팅 진입점 + 게이트 | Routes 5개 + FloatingTabBar (home only) + OnboardingGate 래퍼 |
| `src/components/OnboardingGate.tsx` | 온보딩 게이트 | getFlags().onboarded 체크, false면 AlertDialog 1회, setOnboarded(true) |

## 사용할 타입 (types.ts import 필수)
- `Settlement` — /new, /new/items, /new/split, /result의 route state contract

## 검증 방법
1. `pnpm typecheck` — 타입 에러 0
2. `pnpm test` — 모든 packet-*.test.ts 통과
3. `npx next build` — 빌드 성공
4. Manual: /result 직접 접근 → 안됨 or home으로 redirect
5. Manual: 첫 실행 (onboarded=false) → AlertDialog 1회 표시 후 setOnboarded(true)

## 절대 금지 사항
- ❌ main.tsx 수정 (@AI:ANCHOR)
- ❌ react-router-dom 외 라우팅 라이브러리
- ❌ OnboardingGate 없이 직접 라우팅
