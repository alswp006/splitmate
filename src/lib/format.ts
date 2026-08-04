// 통화 포맷팅 유틸리티

export function formatKRW(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(amount));
  return sign + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function parseKRW(formatted: string): number {
  const cleaned = formatted.replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
