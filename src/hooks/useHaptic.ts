import { generateHapticFeedback, type HapticFeedbackOptions } from "@apps-in-toss/web-framework";

export type HapticType = "success" | "tickWeak" | "tickStrong";

export interface UseHapticResult {
  success: () => void;
  tickWeak: () => void;
  tickStrong: () => void;
}

// WebView 밖(로컬 브라우저 등)에서는 SDK 호출이 throw하거나 reject된 Promise를
// 반환할 수 있다 — 둘 다 삼켜서 흰 화면/unhandled rejection을 막는다.
// SDK의 HapticFeedbackType 유니언은 wire상 string으로 열려 있다(.d.ts 주석) — tickStrong 캐스트 전달.
function trigger(type: HapticType) {
  try {
    const result = generateHapticFeedback({ type } as HapticFeedbackOptions);
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      (result as Promise<unknown>).catch(() => {});
    }
  } catch {
    // not supported outside Toss WebView — ignore
  }
}

export function useHaptic(): UseHapticResult {
  return {
    success: () => trigger("success"),
    tickWeak: () => trigger("tickWeak"),
    tickStrong: () => trigger("tickStrong"),
  };
}
