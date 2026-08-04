// 토스 송금 딥링크 유틸리티

import { openURL } from "@apps-in-toss/web-framework";

// 토스 인앱 송금 스킴(supertoss://) — http(s) 외부 URL 아님, 앱 내부 이동만 발생
const TRANSFER_SCHEME = "supertoss://send";

export async function requestTransfer(
  amount: number,
  recipientName?: string
): Promise<boolean> {
  if (!Number.isFinite(amount) || amount <= 0) return false;

  const integerAmount = Math.trunc(amount);
  const params = new URLSearchParams({ amount: String(integerAmount) });
  if (recipientName) params.set("message", recipientName);

  try {
    await openURL(`${TRANSFER_SCHEME}?${params.toString()}`);
    return true;
  } catch {
    return false;
  }
}
