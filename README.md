# SplitMate

앱인토스 (Vite + React + TDS) 모임·여행 정산을 초간단하게 — 더치페이 계산기에 리워드 광고로 '1/N 영수증' PDF 출력 잠금 해제 친구·동료와 식사·여행 후 복잡한 더치페이 계산을 카카오톡 계산기나 엑셀로 수동 처리하며 시간 낭비. 특히 개별 아이템 분담·비균등 분할이 불편함

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Home` | Home |
| `/Items` | Items |
| `/NewSettlement` | NewSettlement |
| `/Result` | Result |
| `/Split` | Split |
| `/zzz-probe` | Zzz probe |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-08-04
