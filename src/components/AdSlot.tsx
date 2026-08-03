import { useEffect } from "react";

interface AdSlotProps {
  /** 광고 슬롯 식별자 — 추후 실제 광고 SDK 연동 시 사용 */
  slotId?: string;
}

interface NativeBridge {
  postMessage: (message: string) => void;
}

export default function AdSlot({ slotId = "result-bottom" }: AdSlotProps) {
  useEffect(() => {
    try {
      const bridge = (window as unknown as { ReactNativeWebView?: NativeBridge })
        .ReactNativeWebView;
      if (!bridge || typeof bridge.postMessage !== "function") return;
      bridge.postMessage(JSON.stringify({ type: "ad:request", slotId }));
    } catch {
      // SDK 브릿지가 없는 환경(웹/테스트)에서는 조용히 무시 — 흰 화면 방지
    }
  }, [slotId]);

  return null;
}
