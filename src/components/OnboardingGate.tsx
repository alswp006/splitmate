import { useState } from "react";
import { AlertDialog } from "@toss/tds-mobile";
import { getFlags, setOnboarded } from "@/lib/storage";

/**
 * 앱 레벨 온보딩 게이트.
 *
 * 최초 진입(splitmate:flags.onboarded=false) 시 SplitMate 사용 안내를 AlertDialog로
 * 1회 표시하고, "시작하기" 확인 시 onboarded=true를 저장해 다시는 노출하지 않는다.
 * 취소 버튼은 두지 않는다(토스 UX — 안내는 확인만).
 */
export function OnboardingGate() {
  // 첫 렌더에서 플래그를 읽어 노출 여부를 결정(마운트 시 1회).
  const [open, setOpen] = useState(() => !getFlags().onboarded);

  function handleStart() {
    setOnboarded(true);
    setOpen(false);
  }

  return (
    <AlertDialog
      open={open}
      title="SplitMate"
      description="항목별·비균등 정산을 간편하게. 누가 무엇을 먹었는지까지 반영해 정확한 부담액을 계산해요."
      alertButton={<AlertDialog.AlertButton onClick={handleStart}>시작하기</AlertDialog.AlertButton>}
      onClose={handleStart}
    />
  );
}
