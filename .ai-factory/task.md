Looking at the SPEC and the rewritten TASK, the format fix (plain labels + bracketed `Covers:` arrays) is correct and coverage is complete (56/56, with F6-AC1 → Task 3.5 and F7-AC4 → Task 2.3 confirmed). One real gap remains: **Task 4.1 lists `HomePage.tsx` in `Files:`, which Task 3.1 already owns** — a file conflict where onboarding logic collides with the home screen. I'll resolve it by moving the onboarding gate to App-level so file ownership stays clean, and output the complete TASK.

# TASK — SplitMate

## Epic 1. Data Layer — TypeScript 타입 + 인터페이스

### Task 1.1 엔티티 타입 & RouteState 정의
- Description: 모든 데이터 모델(`Participant`, `SettlementItem`, `SplitRule`, `Settlement`, `ParticipantShare`, `SettlementResult`)과 storage 반환용 `SaveResult`(`{ ok: true; settlement: Settlement } | { ok: false; error: string }`), 그리고 페이지 간 데이터 계약인 `RouteState`를 순수 타입으로 정의한다. 런타임 코드 없음(타입/인터페이스만). RouteState는 아래처럼 S1~S5 Navigation 계약과 1:1 대응:
  ```ts
  export type RouteState = {
    "/": undefined;
    "/new": undefined;
    "/new/items": { title: string; participants: Participant[] };
    "/new/split": { title: string; participants: Participant[]; items: SettlementItem[] };
    "/result": { settlementId: string };
  };
  ```
- DoD: `import`만으로 `tsc` 통과. `SplitMode = 'even'|'ratio'|'fixed'|'excluded'` 유니온 포함. `Settlement`은 SPEC 필드/제약(participants 2~20, items 0~50 등)을 주석으로 명시. RouteState의 모든 경로 키가 S1~S5 Navigation 계약과 정확히 일치. 페이지가 `useLocation().state as RouteState["<path>"]`로 캐스팅 가능한 형태.
- Covers: [F1-AC1, F5-AC1]
- Files: [src/lib/types.ts]
- Depends on: none

**Risk 분석 (Epic 1)**
- Complexity: Low
- Risk factors: RouteState가 실제 `navigate()` 페이로드와 불일치하면 페이지 간 데이터 깨짐. `SplitRule.value`의 mode별 optional 의미 혼동.
- Mitigation: 타입을 최상위 태스크로 고정해 모든 페이지가 동일 계약을 import. 각 페이지 태스크 DoD에 "location.state를 RouteState로 캐스팅 + null 체크"를 명시.

---

## Epic 2. Data Layer — storage · 계산 · 유틸

### Task 2.1 localStorage 저장 계층 (CRUD)
- Description: `splitmate:recent`(최대 3개, 최신순) / `splitmate:flags` 키에 대한 순수 함수 CRUD. UI 없이 단위 테스트 가능. 참조 무결성 검증, 손상 JSON 복구, Quota 예외 처리 포함. 함수: `saveSettlement(s): SaveResult`, `getRecentSettlements(): Settlement[]`, `getSettlementById(id): Settlement | null`, `deleteSettlement(id): { ok: boolean }`, `getFlags()`, `setOnboarded()`.
- DoD:
  - `saveSettlement` 저장 성공 시 0번 인덱스 삽입, 3개 초과 시 마지막(가장 오래된) 제거하여 length=3 유지, 저장된 Settlement 반환.
  - `getRecentSettlements`는 `updatedAt` 내림차순 최대 3개 반환.
  - `splitmate:recent`가 `"{bad"`이면 예외 없이 `[]` 반환 + 키 초기화.
  - `setItem`이 `QuotaExceededError`를 던지면 `{ ok:false, error:"저장 공간이 부족합니다" }` 반환 + 기존 데이터 미훼손.
  - `item.participantIds`에 없는 participantId 포함 시 `{ ok:false, error:"참여자 정보가 올바르지 않습니다" }` 반환, 저장 안 함.
  - `deleteSettlement("abc")`가 해당 항목 제거 후 저장, `{ ok:true }` 반환.
- Covers: [F1-AC1, F1-AC2, F1-AC3, F1-AC4, F1-AC5, F1-AC6, F1-AC7]
- Files: [src/lib/storage.ts]
- Depends on: Task 1.1

### Task 2.2 분할 계산 순수 함수
- Description: 참여자별 분할 모드(even/ratio/fixed/excluded)와 항목 배분을 합산해 `SettlementResult`를 계산하는 순수 함수. 반올림 잔차를 첫 참여자에 가산해 총합 보존. 검증 실패 시 에러 반환. 함수: `calculateSplit(input): { ok:true; result:SettlementResult } | { ok:false; error:string }`.
- DoD:
  - `sum(shares.amount) === total` 항상 성립(1원 단위 반올림, 잔차 첫 참여자 가산).
  - 3명·30,000원 전원 even → 각 10,000원, 합 30,000.
  - 30,000원, 지민 fixed=12,000, 나머지 2명 even → 지민 12,000 / 나머지 각 9,000.
  - 3명·30,000원, 현우 excluded → 현우 0, 나머지 각 15,000, 합 30,000.
  - 고정금액 합 40,000 > 총액 30,000 → `{ ok:false, error:"고정 금액 합이 총액을 초과했어요" }`.
  - 전원 excluded → `{ ok:false, error:"최소 1명은 정산에 포함되어야 해요" }`.
- Covers: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6]
- Files: [src/lib/calc.ts]
- Depends on: Task 1.1

### Task 2.3 통화 포맷 & 토스 송금 딥링크 유틸
- Description: 금액 3자리 콤마 포맷/파싱 함수와 토스 인앱 송금 딥링크 호출 헬퍼(`@apps-in-toss/web-framework`). 외부 http(s) URL을 절대 열지 않으며, 미지원/실패 시 boolean으로 반환해 호출 측이 폴백 Toast를 띄우게 한다. 함수: `formatKRW(n): string`, `parseKRW(s): number`, `requestTransfer(amount): Promise<boolean>`.
- DoD:
  - `formatKRW(45000)==="45,000"`, `parseKRW("45,000")===45000`.
  - `requestTransfer`는 토스 인앱 송금 스킴/SDK API만 사용, `window.open`/`window.location.href`로 http(s) 외부 URL을 열지 않음(코드에 부재).
  - 딥링크에 전달하는 금액은 정수 원(소수점·콤마 없음).
  - 딥링크 호출 실패/미지원 시 예외를 삼키고 `false` 반환(크래시 없음) — 호출 측이 "송금 화면을 열 수 없어요" Toast 폴백 가능.
- Covers: [F7-AC1, F7-AC2, F7-AC4, F7-AC5]
- Files: [src/lib/format.ts, src/lib/transfer.ts]
- Depends on: Task 1.1

**Risk 분석 (Epic 2)**
- Complexity: Medium
- Risk factors: 반올림 잔차 미보정 시 총합 불일치(SPEC 핵심 계약 위반). `QuotaExceededError` 처리 중 기존 데이터 손상. 딥링크 미지원 환경 크래시.
- Mitigation: 계산/저장/유틸을 분리된 순수 함수로 두어 UI 없이 단위 테스트. storage 태스크를 페이지보다 먼저 완료해 페이지가 검증된 API만 소비. 딥링크는 try/catch로 boolean 반환 계약 고정.

---

## Epic 3. UI Pages (1 페이지 = 1 태스크)

> 공통 DoD(모든 페이지): `location.state`는 `useLocation().state as RouteState["<path>"] ?? null`로 받고 캐스팅 전 null 확인. state 필수 페이지는 부재 시 `<Navigate to="/" replace />`로 안전 이탈(`.map` on undefined 금지). 상호작용 요소 ≥ 44px. 색상은 `var(--tds-color-*)`/TDS만. 여백은 TDS `Spacing`(size 필수)만.

### Task 3.1 홈 화면 `/` (최근 내역)
- Description: 진입 시 `getRecentSettlements()`를 `updatedAt` 내림차순 ListRow 카드로 렌더(title·참여자 수·총액 `t3`). 빈/로딩 상태, 카드 탭 진입, 길게 눌러 삭제 흐름 제공. Incoming state=undefined.
- DoD:
  - 최근 정산을 내림차순 ListRow 카드(각 title·참여자 수·총액, 총액 `t3` 강조)로 렌더.
  - "새 정산 시작" TDS Button(display="block") 탭 → `navigate('/new')`.
  - 카드(≥44px) 탭 → `navigate('/result', { state: { settlementId } })`.
  - 빈 배열이면 `Asset.ContentIcon` + "아직 정산 내역이 없어요" + CTA만, 리스트 미렌더.
  - 초기 마운트 1프레임 Skeleton 3개 → 조회 후 실제 리스트 교체.
  - 카드 길게 누름 → BottomSheet "삭제" → AlertDialog "삭제하시겠어요?" 확인 → `deleteSettlement` 후 제거 + Toast "삭제되었어요".
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7]
- Files: [src/pages/HomePage.tsx]
- Depends on: Task 2.1

### Task 3.2 기본 정보 입력 `/new`
- Description: 제목·참여자 이름 입력. 참여자 2~20명, 이름 1~10자·공백 불가·중복 불가 검증. Chip 리스트 관리 후 항목 화면으로 데이터 전달. Incoming state=undefined.
- DoD:
  - 이름 TextField에 "지민" 입력 후 "추가" → Chip 추가 + 필드 클리어.
  - 참여자 ≥2 & 제목 입력 시 SubmitFooter "다음" → `navigate('/new/items', { state: { title, participants } })`.
  - 참여자 1명이면 "다음" disabled + "참여자를 2명 이상 추가해주세요".
  - 중복 이름 추가 시 "이미 추가된 이름이에요", 추가 안 됨.
  - 공백/11자+ 이름 → "이름은 1~10자로 입력해주세요".
  - TextField 텍스트 키보드, Enter(onSubmitEditing)로도 추가.
  - Chip 삭제(x) 탭 시 해당 참여자 제거.
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7]
- Files: [src/pages/NewSettlementPage.tsx]
- Depends on: Task 1.1

### Task 3.3 항목 입력 `/new/items`
- Description: `location.state`(title·participants)를 받아 항목명/금액/참여자 다중선택으로 항목 추가, 총합 실시간 표시. 항목 0개면 균등 분할 안내 후 진행 허용. state 없이 직접 진입 시 홈으로 안전 이탈.
- DoD:
  - `useLocation().state as RouteState["/new/items"] ?? null` → null이면 `<Navigate to="/" replace />`(크래시·`.map` on undefined 없음).
  - `{ label:"스테이크", amount:45000 }` + 지민·현우 선택 후 "항목 추가" → 리스트 추가 + 총합 45,000.
  - 금액 TextField `inputMode="numeric"` + 콤마 포맷(`formatKRW`).
  - 항목 ≥1 시 "다음" → `navigate('/new/split', { state: { title, participants, items } })`.
  - amount 0/음수 → "금액을 1원 이상 입력해주세요".
  - 참여자 미선택 → "이 항목을 나눌 참여자를 선택해주세요".
  - 항목 0개 시 "항목이 없으면 총액을 똑같이 나눠요" 안내 + "다음" 활성.
  - 항목 20개 초과 시 가상 스크롤(렌더=가시영역+5).
  - 항목 ListRow 우측 삭제(≥44px) 탭 → 제거 + 총합 재계산.
- Covers: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC7, F4-AC8]
- Files: [src/pages/ItemsPage.tsx]
- Depends on: Task 1.1, Task 2.3

### Task 3.4 분할 설정 `/new/split` (계산 실행 + 저장)
- Description: `location.state`(title·participants·items)를 받아 참여자별 mode(균등/비율/고정/제외) 지정. "결과 보기" 탭 시 `calculateSplit` 실행 → 검증 통과 시 `saveSettlement` 후 결과로 이동. state 없이 직접 진입 시 홈으로 안전 이탈.
- DoD:
  - `useLocation().state as RouteState["/new/split"] ?? null` → null이면 `<Navigate to="/" replace />`.
  - 참여자별 ListRow + mode Chip/Tab(≥44px), 비율/고정은 TextField 입력.
  - 고정 합 초과 시 이동 안 함 + "고정 금액 합이 총액을 초과했어요"(calc 에러 인라인).
  - 전원 excluded 시 "최소 1명은 정산에 포함되어야 해요".
  - 계산·전환 준비 중 "결과 보기" Button `loading`, 중복 탭 무시.
  - 계산 성공 → `saveSettlement`로 Settlement 저장 → `navigate('/result', { state: { settlementId } })`.
- Covers: [F5-AC7, F5-AC8]
- Files: [src/pages/SplitPage.tsx]
- Depends on: Task 2.1, Task 2.2

### Task 3.5 결과 화면 `/result` (배너 + 리워드 공유 + 송금)
- Description: `settlementId`로 정산 조회 후 총액 히어로·참여자별 카드 렌더, 하단 배너 배치. 공유는 리워드 광고 게이팅, 참여자별 토스 송금 딥링크 제공. state/정산 부재 시 크래시 없이 빈 상태.
- DoD:
  - `useLocation().state as RouteState["/result"] ?? null` → null이거나 `getSettlementById`가 null이면 "정산을 찾을 수 없어요" 빈 상태 + "홈으로" 버튼(`navigate('/')`). `.map` on undefined 금지.
  - `ScreenScaffold` 래핑. 총액 `data-testid="total-hero"` `SummaryHero`(CountUp value=total). 참여자별 `data-testid="share-card"` Card 리스트(각 name + amount `t2` 강조).
  - `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`를 카드 리스트 아래 별도 섹션(콘텐츠와 겹침 없음).
  - "정산 내역 공유" 탭 → `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 시청 완료 → 공유 BottomSheet(이미지 저장/텍스트 복사).
  - "텍스트 복사" 탭 → 부담액 문자열 클립보드 복사 + Toast "복사되었어요".
  - 광고 로드/시청 실패 시 시트 미개방 + "광고를 불러오지 못했어요. 다시 시도해주세요" Toast, 화면 유지.
  - 광고 로딩 중 공유 버튼 `loading` + 중복 탭 차단.
  - 참여자 비중 `MiniBar`(amount/total) 시각화.
  - 카드 "송금 요청"(≥44px) 탭 → `requestTransfer(share.amount)`(정수 원 프리필). amount=0이면 disabled. 딥링크 실패 시 "송금 화면을 열 수 없어요" Toast, 상태 유지.
- Covers: [F6-AC1, F6-AC2, F6-AC3, F6-AC4, F6-AC5, F6-AC6, F6-AC7, F6-AC8, F7-AC3]
- Files: [src/pages/ResultPage.tsx]
- Depends on: Task 2.1, Task 2.3

**Risk 분석 (Epic 3)**
- Complexity: High
- Risk factors: state 부재로 결과/중간 페이지 직접 진입·새로고침 시 `.map` on undefined 크래시(2026-08-03 SplitMate 실사고: 완주 0%). 가상 스크롤 오구현으로 항목 누락. 리워드 광고 콜백 실패 시 공유 시트 오개방.
- Mitigation: 데이터 계층(2.1~2.3)을 먼저 확정해 페이지가 검증된 API만 소비. 모든 state 수신 페이지 DoD에 "null 확인 후 안전 이탈/빈 상태" 수용 기준 명시. 페이지당 1 태스크로 분리해 세션 내 완결.

---

## Epic 4. Integration + Landing

### Task 4.1 라우팅 배선 · 온보딩 게이트 · 검수 컴플라이언스
- Description: React Router로 `/`, `/new`, `/new/items`, `/new/split`, `/result` 배선 + FloatingTabBar 연결. 첫 실행 온보딩을 **App 레벨 게이트**(`src/App.tsx`)에서 1회 노출하여 HomePage(3.1)와 파일/책임 충돌 없이 분리. 전역 검수 규칙(콘솔 에러 0·외부 링크 금지·다크모드·호환성·외부 분석 미로드) 최종 점검.
- DoD:
  - 5개 라우트가 `react-router-dom`으로 배선되고 각 페이지가 RouteState 계약대로 렌더. 정의되지 않은 경로는 `/`로 리다이렉트.
  - 온보딩은 `src/App.tsx`(라우터 outlet 상위)에서만 렌더 — `HomePage.tsx`를 수정하지 않음(Task 3.1과 파일 충돌 없음).
  - `getFlags().onboarded===false`로 앱 최초 진입 시 AlertDialog "항목별·비균등 정산을 간편하게" 1회 표시, "시작하기" 탭 시 `setOnboarded(true)` 후 재노출 안 함.
  - 프로덕션 빌드에서 `console.error` 0개.
  - 외부 웹/앱 이동·"앱 설치/다운로드" 유도 문구·링크·배너 부재(코드 grep 확인).
  - 색상은 `var(--tds-color-*)`/TDS만(HEX 하드코딩 0), 다크모드에서 텍스트 대비 유지.
  - Android 7+/iOS 16+ 동작, 최신 전용 브라우저 API 미사용.
  - Google Analytics/Amplitude 등 외부 분석·로깅 미로드(의존성·네트워크 요청 부재).
- Covers: [F8-AC1, F8-AC2, F8-AC3, F8-AC4, F8-AC5, F8-AC6]
- Files: [src/App.tsx, src/router.tsx]
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5

**Risk 분석 (Epic 4)**
- Complexity: Medium
- Risk factors: 라우트 배선 누락/오타로 state 계약 불일치. 검수 반려 요인(HEX 하드코딩, 외부 링크, `console.error`) 잔존. 온보딩 무한 노출(flag 저장 실패). HomePage 공동 편집 시 3.1과 병합 충돌.
- Mitigation: 모든 페이지 완성 후 마지막에 배선해 계약 일괄 검증. 온보딩을 App 레벨로 분리해 HomePage 파일 충돌 제거. 컴플라이언스를 단일 태스크로 모아 grep/빌드 점검을 DoD화. 온보딩 flag는 검증된 `storage.ts`(2.1) 사용.

---

## AC Coverage
- Total ACs in SPEC: 56 (F1:7, F2:7, F3:7, F4:8, F5:8, F6:8, F7:5, F8:6)
- Covered by tasks: 56
  - F1 (7) → Task 2.1: AC1~AC7 (AC1 also in Task 1.1)
  - F2 (7) → Task 3.1: AC1~AC7
  - F3 (7) → Task 3.2: AC1~AC7
  - F4 (8) → Task 3.3: AC1~AC8
  - F5 (8) → Task 2.2: AC1~AC6 (AC1 also in Task 1.1) / Task 3.4: AC7, AC8
  - F6 (8) → Task 3.5: AC1~AC8
  - F7 (5) → Task 2.3: AC1, AC2, AC4, AC5 / Task 3.5: AC3
  - F8 (6) → Task 4.1: AC1~AC6
- Uncovered: 0 ✅ (F6-AC1 → Task 3.5, F7-AC4 → Task 2.3 확인 완료)

---

**변경 요약**
1. **파일 충돌 해소 (신규 수정)**: Task 4.1의 `Files:`에서 `src/pages/HomePage.tsx`를 제거하고 온보딩을 **App 레벨 게이트**로 이동. 이로써 Task 3.1(HomePage 소유)과 Task 4.1 간 파일 공동 편집/병합 충돌을 제거하고, 온보딩 flag 트리거를 `getFlags()` 기반으로 명시.
2. **포맷 통일 (유지)**: 모든 태스크 필드를 템플릿 평문 라벨(`- DoD:`, `- Covers: [...]`, `- Files: [...]`, `- Depends on:`)로 유지, `Covers` 값은 대괄호 배열로 통일 → 파서가 DoD/Covers/Files 및 AC 목록 인식.
3. **커버리지 확인**: F6-AC1(Task 3.5), F7-AC4(Task 2.3)가 각 `Covers:`에 명시적 포함. 56/56 AC 전량 커버, 미커버 0.