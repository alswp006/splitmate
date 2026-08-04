# SPEC — SplitMate

## Common Principles

- **플랫폼**: 앱인토스 (Vite + React + TypeScript + TDS `@toss/tds-mobile`), React Router(`react-router-dom`) 클라이언트 라우팅, 데이터는 localStorage 저장.
- **인증**: 토스 앱이 세션 자동 제공 — 로그인 함수 호출/커스텀 인증 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 통합 여부만 확인.
- **UI 원칙**: 모든 UI는 TDS 핵심 컴포넌트(ListRow, Button, TextField, Paragraph.Text, Chip, Switch, AlertDialog, BottomSheet, Toast, Top, Tab)로 조립. 하단 탭은 템플릿 `src/components/FloatingTabBar` 사용. 여백은 TDS `Spacing`(size 필수)만 사용, Tailwind/인라인 스타일로 TDS 내장 여백 덮어쓰기 금지. flex/grid 배치에만 커스텀 CSS 허용.
- **색상**: HEX 하드코딩 금지 — `var(--tds-color-*)` 또는 TDS 컴포넌트만 사용(다크모드 필수).
- **터치 타깃**: 모든 상호작용 요소 ≥ 44px.
- **광고**: 배너는 템플릿 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 리워드 게이트는 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>{children}</TossRewardAd>`. ID는 콘솔에서 env 주입.
- **AI 고지 의무**: 해당 없음 — SplitMate는 생성형 AI 결과물을 노출하지 않음(순수 규칙 기반 계산). AI 고지 AC 생략.
- **외부 이탈**: 토스 송금 딥링크(앱 내부 스킴)만 허용. `window.open`/`window.location.href`로 외부 웹/앱 이동 및 설치 유도 금지.
- **출력 언어**: 한국어.
- **통화 규칙**: 금액은 원(KRW) 정수. 분할 결과는 1원 단위 반올림, 반올림 잔차는 첫 번째 참여자에게 가산(총합 보존).

---

## Data Models

### Participant — 참여자
| 필드 | 타입 | 제약 |
|---|---|---|
| id | `string` | UUID(crypto.randomUUID), 필수 |
| name | `string` | 1~10자, 공백 불가, 정산 내 중복 불가 |

### SettlementItem — 정산 항목
| 필드 | 타입 | 제약 |
|---|---|---|
| id | `string` | UUID, 필수 |
| label | `string` | 1~20자 (예: "스테이크") |
| amount | `number` | 정수, 1 ~ 100,000,000 |
| participantIds | `string[]` | length ≥ 1, Participant.id 참조 |

### SplitRule — 분할 규칙(참여자별)
| 필드 | 타입 | 제약 |
|---|---|---|
| participantId | `string` | Participant.id 참조 |
| mode | `'even' \| 'ratio' \| 'fixed' \| 'excluded'` | 필수 |
| value | `number` | mode='ratio'→비율(>0), 'fixed'→고정금액(≥0 정수), 그 외 무시 |

### Settlement — 정산
```ts
interface Settlement {
  id: string;                 // UUID
  title: string;              // 1~20자
  participants: Participant[]; // 2~20명
  items: SettlementItem[];    // 0~50개
  splitRules: SplitRule[];    // 참여자 1인당 1개
  createdAt: number;          // epoch ms
  updatedAt: number;          // epoch ms
}
```

### SettlementResult — 계산 결과(파생, 저장 안 함)
```ts
interface ParticipantShare {
  participantId: string;
  name: string;
  amount: number;   // 최종 부담액(원, 정수)
}
interface SettlementResult {
  total: number;               // 총액
  shares: ParticipantShare[];  // 참여자별 부담액, 합계 === total
}
```

### localStorage 저장
| Key | Shape | 크기 추정 |
|---|---|---|
| `splitmate:recent` | `Settlement[]` (최대 3개, 최신순) | 정산 1개 ≈ 3KB(참여자 20·항목 50 가정) → 최대 ≈ 9KB |
| `splitmate:flags` | `{ onboarded: boolean }` | < 100B |

**총 사용량**: < 20KB (5MB 한도 대비 안전).

---

## Feature List

### F1. 정산 데이터 모델 & localStorage 저장 계층

- **Description**: Settlement/Participant/Item/SplitRule 타입과 localStorage 읽기·쓰기 유틸을 제공한다. 최근 정산은 최대 3개만 최신순으로 유지하며 4번째 저장 시 가장 오래된 항목을 제거한다. 저장/조회/삭제의 순수 함수 계층으로, UI 없이 단위 테스트 가능하다.
- **Data**: Settlement, `splitmate:recent`, `splitmate:flags`
- **API**: 없음 (localStorage 전용)
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 정산 저장 성공
    - Given 유효한 Settlement `{ title: "제주여행", participants: 2명, items: 1개 }`
    - When `saveSettlement(settlement)` 호출
    - Then `splitmate:recent`의 0번 인덱스에 해당 항목이 저장되고, 반환값은 저장된 Settlement
  - **AC-2 [E][P0]**: Scenario: 최근 3개 초과 시 오래된 항목 제거
    - Given `splitmate:recent`에 이미 3개 정산이 있을 때
    - When 4번째 정산을 `saveSettlement`로 저장
    - Then 배열 length는 3으로 유지되고, 가장 오래된(마지막) 항목이 제거되며 새 항목이 0번 인덱스에 위치
  - **AC-3 [U][P0]**: The system shall `getRecentSettlements()` 호출 시 `updatedAt` 내림차순으로 최대 3개를 반환한다
  - **AC-4 [W][P1]**: Scenario: 손상된 JSON 복구
    - Given `splitmate:recent`에 파싱 불가한 문자열 `"{bad"` 이 저장된 경우
    - When `getRecentSettlements()` 호출
    - Then 예외를 던지지 않고 빈 배열 `[]`을 반환하고, 해당 키를 초기화
  - **AC-5 [W][P1]**: Scenario: 저장 용량 초과
    - Given localStorage `setItem`이 `QuotaExceededError`를 던지는 상태
    - When `saveSettlement` 호출
    - Then `{ ok: false, error: "저장 공간이 부족합니다" }` 반환하고 기존 데이터를 훼손하지 않음
  - **AC-6 [W][P1]**: Scenario: 잘못된 참조 거부
    - Given item.participantIds에 존재하지 않는 participantId가 포함된 Settlement
    - When `saveSettlement` 호출
    - Then `{ ok: false, error: "참여자 정보가 올바르지 않습니다" }` 반환, 저장 안 함
  - **AC-7 [E][P1]**: Scenario: 정산 삭제
    - Given `splitmate:recent`에 id=`"abc"` 정산이 존재
    - When `deleteSettlement("abc")` 호출
    - Then 배열에서 해당 항목 제거 후 저장, 반환값 `{ ok: true }`

---

### F2. 최근 정산 내역 홈 화면

- **Description**: 앱 진입 시 최근 3개 정산을 카드 리스트로 보여주고 새 정산 시작 진입점을 제공한다. 항목 탭 시 저장된 정산을 불러와 결과 화면으로 이동한다. 저장 내역이 없으면 빈 상태 일러스트와 CTA를 노출한다.
- **Data**: `getRecentSettlements()`
- **API**: 없음
- **Requirements**:
  - **AC-1 [U][P0]**: The system shall 홈 진입 시 `getRecentSettlements()` 결과를 `updatedAt` 내림차순 ListRow 카드로 렌더한다(각 카드에 title·참여자 수·총액 표기)
  - **AC-2 [E][P0]**: Scenario: 새 정산 시작
    - Given 홈 화면
    - When "새 정산 시작" 버튼(TDS Button, display="block") 탭
    - Then `navigate('/new')` 로 이동
  - **AC-3 [E][P0]**: Scenario: 최근 내역 불러오기
    - Given id=`"abc"` 정산 카드가 표시됨
    - When 해당 카드(ListRow, 높이 ≥ 44px) 탭
    - Then `navigate('/result', { state: { settlementId: "abc" } })`
  - **AC-4 [S][P1]**: Scenario: 빈 상태
    - While `getRecentSettlements()`가 빈 배열일 때
    - Then TDS `Asset.ContentIcon` 일러스트 + "아직 정산 내역이 없어요" 문구 + "새 정산 시작" 버튼만 표시하고 리스트는 렌더하지 않음
  - **AC-5 [S][P1]**: Scenario: 로딩 상태
    - While localStorage 조회 중(초기 마운트 1프레임)
    - Then TDS Skeleton 3개를 표시하고, 조회 완료 후 실제 리스트로 교체
  - **AC-6 [E][P1]**: Scenario: 내역 삭제
    - Given 정산 카드를 길게 눌러 나타난 TDS BottomSheet에서
    - When "삭제" 탭 → AlertDialog "삭제하시겠어요?"에서 "삭제" 확인
    - Then `deleteSettlement` 호출 후 리스트에서 제거, Toast "삭제되었어요" 표시
  - **AC-7 [U][P2]**: The system shall 각 카드 총액을 `t3` 강조 타이포로 표기한다

---

### F3. 정산 기본 정보 입력 (제목 · 참여자)

- **Description**: 새 정산의 제목과 참여자 이름 목록을 입력하는 화면. 참여자는 2~20명, 이름은 1~10자·중복 불가로 검증한다. 다음 단계(항목 입력)로 입력 데이터를 넘긴다.
- **Data**: Participant (메모리 상태)
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 참여자 추가
    - Given 기본 정보 화면, 이름 입력 필드(TDS TextField)에 "지민" 입력
    - When "추가" 버튼 탭
    - Then 참여자 Chip 리스트에 "지민" 추가되고 입력 필드 비워짐
  - **AC-2 [E][P0]**: Scenario: 다음 단계 이동
    - Given `{ title: "제주여행", participants: ["지민","현우"] }` 입력 완료(참여자 ≥ 2)
    - When "다음"(SubmitFooter 하단 고정 버튼) 탭
    - Then `navigate('/new/items', { state: { title, participants } })`
  - **AC-3 [W][P1]**: Scenario: 참여자 2명 미만 거부
    - Given 참여자가 1명만 있을 때
    - When "다음" 탭
    - Then 이동하지 않고 에러 메시지 "참여자를 2명 이상 추가해주세요" 표시(하단 버튼 disabled)
  - **AC-4 [W][P1]**: Scenario: 중복 이름 거부
    - Given 참여자에 "지민"이 이미 있을 때
    - When "지민" 재입력 후 "추가" 탭
    - Then 추가되지 않고 에러 메시지 "이미 추가된 이름이에요" 표시
  - **AC-5 [W][P1]**: Scenario: 빈/초과 이름 거부
    - Given 이름 필드가 공백이거나 11자 이상일 때
    - When "추가" 탭
    - Then 추가 안 되고 "이름은 1~10자로 입력해주세요" 표시
  - **AC-6 [U][P1]**: The system shall 이름 TextField 포커스 시 모바일 키보드가 텍스트 모드로 뜨고, "추가" 액션은 키보드 `Enter`(onSubmitEditing)로도 실행된다
  - **AC-7 [E][P1]**: Scenario: 참여자 제거
    - Given 참여자 Chip "지민"이 표시됨
    - When Chip의 삭제(x) 탭
    - Then 리스트에서 "지민" 제거

---

### F4. 항목별 금액 입력 & 인원 지정

- **Description**: 개별 아이템(예: 스테이크 45,000원)을 입력하고 해당 항목을 부담할 참여자를 다중 선택한다. 항목이 없으면 총액을 단일 항목으로 처리할 수 있게 안내한다. 항목 목록과 총합을 실시간 표시한다.
- **Data**: SettlementItem
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 항목 추가 성공
    - Given 항목 화면에서 `{ label: "스테이크", amount: 45000 }` 입력, 참여자 "지민"·"현우" 선택
    - When "항목 추가" 버튼 탭
    - Then 항목 리스트에 추가되고 상단 총합이 45,000원으로 갱신
  - **AC-2 [U][P0]**: The system shall 금액 TextField는 숫자 키보드(`inputMode="numeric"`)를 띄우고 3자리 콤마 포맷으로 표시한다(예: 45000 → "45,000")
  - **AC-3 [E][P0]**: Scenario: 다음 단계 이동
    - Given 항목이 1개 이상 존재
    - When "다음" 탭
    - Then `navigate('/new/split', { state: { title, participants, items } })`
  - **AC-4 [W][P1]**: Scenario: 금액 0/음수 거부
    - Given `{ label: "물", amount: 0 }` 입력
    - When "항목 추가" 탭
    - Then 추가 안 되고 "금액을 1원 이상 입력해주세요" 표시
  - **AC-5 [W][P1]**: Scenario: 참여자 미선택 거부
    - Given 항목 참여자를 아무도 선택하지 않은 상태
    - When "항목 추가" 탭
    - Then 추가 안 되고 "이 항목을 나눌 참여자를 선택해주세요" 표시
  - **AC-6 [S][P1]**: Scenario: 빈 항목 상태
    - While 항목이 0개일 때
    - Then "항목이 없으면 총액을 똑같이 나눠요" 안내 문구를 표시하고 "다음" 버튼은 활성(총액 균등 분할 모드로 진행)
  - **AC-7 [U][P1]**: The system shall 항목 리스트가 20개를 초과하면 스크롤 컨테이너에 가상 스크롤(윈도잉)을 적용해 렌더 항목 수를 화면 가시 영역 + 5개로 제한한다
  - **AC-8 [E][P2]**: Scenario: 항목 삭제
    - Given 항목 "스테이크"가 리스트에 있을 때
    - When 항목 ListRow 우측 삭제 버튼(≥44px) 탭
    - Then 리스트에서 제거되고 총합 재계산

---

### F5. 비균등 분할 설정 & 결과 계산

- **Description**: 참여자별 분할 모드(균등·비율·고정금액·제외)를 지정하고, 항목별 참여자 배분과 규칙을 합산해 최종 부담액을 계산한다. 계산은 순수 함수로 총합이 항상 원 총액과 일치하도록 반올림 잔차를 보정한다.
- **Data**: SplitRule, SettlementResult
- **API**: 없음
- **Requirements**:
  - **AC-1 [U][P0]**: The system shall 각 참여자 부담액 합계(`sum(shares.amount)`)가 전체 총액과 정확히 일치하도록 반올림 잔차를 첫 번째 참여자에 가산한다
  - **AC-2 [E][P0]**: Scenario: 균등 분할 계산
    - Given 참여자 3명, 총액 30,000원, 전원 mode='even'
    - When "결과 보기" 탭 → 계산 실행
    - Then shares = 각 10,000원, 합계 30,000원
  - **AC-3 [E][P0]**: Scenario: 고정금액 + 균등 혼합
    - Given 총액 30,000원, "지민" mode='fixed' value=12000, 나머지 2명 'even'
    - When 계산 실행
    - Then "지민"=12,000원, 나머지 각 9,000원, 합계 30,000원
  - **AC-4 [E][P0]**: Scenario: 제외 처리
    - Given 참여자 3명, 총액 30,000원, "현우" mode='excluded'
    - When 계산 실행
    - Then "현우"=0원, 나머지 2명 각 15,000원, 합계 30,000원
  - **AC-5 [W][P1]**: Scenario: 고정금액 합이 총액 초과 거부
    - Given 총액 30,000원인데 고정금액 합계가 40,000원
    - When "결과 보기" 탭
    - Then 이동하지 않고 "고정 금액 합이 총액을 초과했어요" 에러 표시
  - **AC-6 [W][P1]**: Scenario: 전원 제외 거부
    - Given 모든 참여자 mode='excluded'
    - When "결과 보기" 탭
    - Then "최소 1명은 정산에 포함되어야 해요" 에러 표시
  - **AC-7 [S][P1]**: Scenario: 계산 중 로딩
    - While 계산 함수 실행 및 화면 전환 준비 중일 때
    - Then "결과 보기" 버튼을 TDS Button `loading` 상태로 전환하고 중복 탭을 무시한다
  - **AC-8 [E][P0]**: Scenario: 결과로 이동
    - Given 계산 성공, Settlement 저장 완료(F1)
    - When 계산 완료
    - Then `navigate('/result', { state: { settlementId } })`

---

### F6. 결과 화면 (배너) + 리워드 광고 게이팅 공유

- **Description**: 참여자별 부담액을 카드로 표시하고 하단에 배너 광고를 배치한다. "정산 내역 공유"는 리워드 광고 시청 완료 후에만 이미지/텍스트 공유가 활성화된다. 핵심 가치 화면으로 총액 히어로·참여자별 카드 위계를 갖춘다.
- **Data**: Settlement, SettlementResult
- **API**: 없음
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 결과 레이아웃 계약
    - Given 결과 화면
    - Then `ScreenScaffold`로 감싸고, 총액을 `data-testid="total-hero"` `SummaryHero`(CountUp value=total)로, 참여자별 부담액을 `data-testid="share-card"` Card 리스트(각 name + amount `t2` 강조)로 렌더한다
  - **AC-2 [U][P0]**: The system shall 배너 광고 `<AdSlot adGroupId={...} />`를 참여자 카드 리스트 아래(콘텐츠와 겹치지 않는 별도 섹션)에 배치한다
  - **AC-3 [E][P0]**: Scenario: 리워드 광고 후 공유 잠금 해제
    - Given 결과 화면에서 "정산 내역 공유" 버튼 탭
    - When `<TossRewardAd slotId={...}>` 광고 시청 완료
    - Then 공유 BottomSheet(이미지 저장 / 텍스트 복사)가 표시됨
  - **AC-4 [E][P1]**: Scenario: 텍스트 공유
    - Given 공유 BottomSheet에서
    - When "텍스트 복사" 탭
    - Then 참여자별 부담액 문자열이 클립보드에 복사되고 Toast "복사되었어요" 표시
  - **AC-5 [W][P1]**: Scenario: 광고 로드 실패
    - Given 리워드 광고 로드/시청이 실패(에러 콜백)한 경우
    - When 공유 시도
    - Then 공유 시트를 열지 않고 "광고를 불러오지 못했어요. 다시 시도해주세요" Toast 표시, 앱은 결과 화면 유지
  - **AC-6 [W][P1]**: Scenario: 잘못된 진입
    - Given `location.state.settlementId`에 해당하는 정산이 localStorage에 없을 때
    - When 결과 화면 마운트
    - Then "정산을 찾을 수 없어요" 빈 상태 + "홈으로" 버튼 표시(크래시 없음)
  - **AC-7 [S][P1]**: Scenario: 광고 로딩 상태
    - While 리워드 광고 로드 중일 때
    - Then 공유 버튼을 `loading` 상태로 전환하고 중복 탭 차단
  - **AC-8 [U][P2]**: The system shall 참여자별 비중을 `MiniBar`로 시각화한다(각 참여자 amount / total 비율)

---

### F7. 토스 송금 딥링크 정산 요청

- **Description**: 결과 화면에서 각 참여자에게 부담액만큼 토스 송금을 1탭으로 요청한다. 토스 앱 내부 송금 스킴만 사용하며 외부 도메인 이탈은 하지 않는다.
- **Data**: ParticipantShare
- **API**: 없음 (토스 인앱 딥링크/`@apps-in-toss/web-framework` API 사용)
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 송금 요청 실행
    - Given 결과 화면 참여자 카드의 "송금 요청"(≥44px) 탭, share.amount=15000
    - When 탭
    - Then 토스 인앱 송금 화면(금액 15,000원 프리필)을 여는 딥링크가 호출됨
  - **AC-2 [W][P0]**: Scenario: 외부 도메인 이탈 금지
    - Given 송금 딥링크 처리
    - When 딥링크 호출
    - Then `window.location.href`/`window.open`으로 http(s) 외부 URL을 열지 않으며, 토스 인앱 스킴만 사용
  - **AC-3 [W][P1]**: Scenario: 송금액 0원 비활성
    - Given share.amount=0 (제외된 참여자)
    - When 해당 카드
    - Then "송금 요청" 버튼이 disabled 처리됨
  - **AC-4 [W][P1]**: Scenario: 딥링크 미지원 폴백
    - Given 딥링크 호출이 실패/미지원인 환경
    - When "송금 요청" 탭
    - Then "송금 화면을 열 수 없어요" Toast 표시, 앱 상태 유지(크래시 없음)
  - **AC-5 [U][P1]**: The system shall 송금 요청 딥링크에 금액을 정수 원 단위로 전달하며 소수점/콤마를 포함하지 않는다

---

### F8. 온보딩 안내 & 검수 컴플라이언스

- **Description**: 첫 실행 시 앱 사용 흐름을 1회 안내하고, 검수 통과를 위한 전역 규칙(콘솔 에러 0, 외부 링크/설치 유도 금지, 다크모드, 호환성)을 보장한다.
- **Data**: `splitmate:flags`
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P1]**: Scenario: 온보딩 1회 노출
    - Given `splitmate:flags.onboarded`가 false일 때 홈 최초 진입
    - When 화면 마운트
    - Then TDS AlertDialog로 "항목별·비균등 정산을 간편하게" 안내 1회 표시, "시작하기" 탭 시 `onboarded=true` 저장
  - **AC-2 [U][P0]**: The system shall 프로덕션 빌드에서 `console.error` 출력이 0개다
  - **AC-3 [W][P0]**: The system shall 서비스 본질과 무관한 외부 웹/앱 이동 및 "앱 설치/다운로드" 유도 문구·배너·링크를 포함하지 않는다
  - **AC-4 [U][P0]**: The system shall 색상을 `var(--tds-color-*)`/TDS 컴포넌트로만 지정하고 HEX 하드코딩을 사용하지 않으며 다크모드에서 텍스트 대비를 유지한다
  - **AC-5 [U][P1]**: The system shall Android 7+/iOS 16+에서 동작하며 최신 전용 브라우저 API를 사용하지 않는다
  - **AC-6 [W][P1]**: The system shall Google Analytics/Amplitude 등 외부 분석·로깅 솔루션을 로드하지 않는다

---

## Screen Definitions

### S1. 홈 (최근 내역) — `/`
- **TDS 컴포넌트**: `Top`(헤더), ListRow(정산 카드), TDS Button(display="block", "새 정산 시작"), `Asset.ContentIcon`(빈 상태), Skeleton(로딩), BottomSheet+AlertDialog(삭제), Toast, FloatingTabBar(템플릿).
- **레이아웃**: `ScreenScaffold`로 감싸기. 카드 총액 `t3` 강조.
- **상태**: 로딩=Skeleton 3개 / 빈=일러스트+CTA / 에러=손상 데이터 시 빈 배열 폴백.
- **터치**: 카드 ListRow·버튼 ≥ 44px.
- **Navigation**:
  - Incoming: `location.state = undefined`
  - Outgoing: `navigate('/new')` | `navigate('/result', { state: { settlementId: string } })`

### S2. 기본 정보 입력 — `/new`
- **TDS 컴포넌트**: `Top`, TDS TextField(제목·이름), TDS Button("추가"), Chip(참여자, 삭제 지원), SubmitFooter(하단 고정 "다음"), Paragraph.Text(에러).
- **상태**: 로딩=없음 / 빈=참여자 0명 안내 / 에러=검증 메시지 인라인.
- **키보드**: 텍스트 모드, Enter로 참여자 추가.
- **터치**: Chip 삭제·버튼 ≥ 44px.
- **Navigation**:
  - Incoming: `location.state = undefined`
  - Outgoing: `navigate('/new/items', { state: { title: string; participants: Participant[] } })`

### S3. 항목 입력 — `/new/items`
- **TDS 컴포넌트**: `Top`, TDS TextField(항목명·금액 `inputMode="numeric"`), Chip/Switch(항목별 참여자 선택), ListRow(항목 목록), SummaryHero 또는 `t2`(총합), SubmitFooter("다음"), Paragraph.Text(에러).
- **상태**: 로딩=없음 / 빈="총액 균등" 안내 / 에러=검증 인라인.
- **스크롤**: 항목 20개 초과 시 가상 스크롤.
- **키보드**: 금액 숫자 키보드.
- **Navigation**:
  - Incoming: `location.state = { title: string; participants: Participant[] }`
  - Outgoing: `navigate('/new/split', { state: { title, participants, items: SettlementItem[] } })`

### S4. 분할 설정 — `/new/split`
- **TDS 컴포넌트**: `Top`, ListRow(참여자별 분할 모드), Chip/Tab(mode 선택: 균등/비율/고정/제외), TDS TextField(비율·고정 금액), TDS Button("결과 보기", loading 지원), AlertDialog/Paragraph.Text(에러).
- **상태**: 로딩=버튼 loading / 빈=해당없음 / 에러=초과·전원제외 인라인.
- **터치**: 모드 Chip·버튼 ≥ 44px.
- **Navigation**:
  - Incoming: `location.state = { title: string; participants: Participant[]; items: SettlementItem[] }`
  - Outgoing: `navigate('/result', { state: { settlementId: string } })` (계산·F1 저장 후)

### S5. 결과 — `/result`
- **TDS 컴포넌트**: `ScreenScaffold`, SummaryHero(총액 CountUp, `data-testid="total-hero"`), Card(참여자별 `data-testid="share-card"`, amount `t2` 강조, MiniBar 비중), TDS Button("송금 요청" per-card, "정산 내역 공유"), `<AdSlot>`(카드 아래 배너), `<TossRewardAd>`(공유 게이트), BottomSheet(공유 옵션), Toast.
- **상태**: 로딩=광고/공유 버튼 loading / 빈=정산 없음 "홈으로" / 에러=광고 실패·딥링크 실패 Toast.
- **터치**: 송금·공유 버튼 ≥ 44px.
- **레이아웃 AC**: F6-AC1 (total-hero 1개 + share-card N개 + 배너 별도 섹션).
- **Navigation**:
  - Incoming: `location.state = { settlementId: string }`
  - Outgoing: 없음(홈 복귀 `navigate('/')`), 토스 인앱 송금 딥링크(외부 URL 아님).

---

## API Contract

외부 API 없음 — 모든 데이터는 localStorage에 저장하고 계산은 클라이언트 순수 함수로 처리한다. 서버 통신·IAP·프로모션 리워드 사용 안 함. (향후 정산 내역 공유 링크 등 서버 저장이 필요해지면 별도 Railway API 서버를 `{ error: string }` 통일 에러 형태로 신설 — 현재 MVP 범위 밖.)

---

## Assumptions

- 토스 인앱 송금 딥링크(금액·수신자 프리필)를 `@apps-in-toss/web-framework`가 지원한다고 가정. 미지원 시 F7-AC4 폴백으로 처리.
- 참여자 식별은 이름 문자열 기반(토스 사용자 매핑 없이). 송금은 사용자가 수신자를 직접 선택하는 형태.
- 이미지 공유는 결과 화면을 canvas/DOM 캡처로 생성해 저장(외부 업로드 없음).
- 리워드 광고는 "공유 기능"에만 게이팅. 송금·계산 등 핵심 기능은 광고 없이 무료.
- DAU/수익은 PRD 추정치이며 스펙 검증 대상 아님.

## Open Questions

1. 토스 송금 딥링크가 수신자(연락처/토스 유저) 프리필까지 지원하는가, 아니면 금액만 프리필되는가? (F7 상세 UX 영향)
2. 이미지 공유 시 토스 앱의 네이티브 공유 시트를 호출할 수 있는가, 아니면 이미지 저장 후 사용자가 수동 공유하는가?
3. 비율(ratio) 모드와 고정금액 모드를 한 정산에서 혼합할 때 우선순위 규칙(고정 우선 차감 후 잔액을 비율/균등 배분)이 PRD 의도와 일치하는가?
4. 최근 내역을 3개로 제한(PRD 명시)하되, 사용자가 "즐겨찾기"로 더 보관하고 싶어할 가능성이 있는가? (MVP 밖)